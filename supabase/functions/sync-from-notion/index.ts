// Supabase Edge Function: sync-from-notion
// Reads BD Clientes + BD Proyectos + BD Gastos categories from Notion
// and upserts into Supabase.
// Called manually (button) or automatically (pg_cron every hour).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTION_TOKEN       = Deno.env.get("NOTION_TOKEN")!;
const NOTION_CLIENTS_DB  = "1517571d-e218-8251-baf7-0190ea987c13"; // BD Clientes
const NOTION_PROJECTS_DB = "1157571d-e218-8367-b1a2-01b847034157"; // BD Proyectos
const NOTION_EXPENSES_DB = Deno.env.get("NOTION_EXPENSES_DB_ID")!; // BD Gastos
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NOTION_HEADERS = {
  "Authorization": `Bearer ${NOTION_TOKEN}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

// ── CORS ─────────────────────────────────────────────────────────────────────
// The dashboard is served from GitHub Pages (a different origin), so every
// response must carry these headers or the browser blocks the fetch.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

const JSON_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" };

// ── Deletion exceptions ──────────────────────────────────────────────────────
// Sync mirrors Notion: anything Notion no longer has gets deleted here. These
// clients are exempt because their projects live only in the dashboard — the
// internal "Área - ..." ones used to log Zota own hours are not tracked in the
// Notion projects database, and mirroring would wipe them.
const DELETION_EXEMPT_CLIENTS = new Set<string>(["Zota IA Consulting"]);

// ── Notion fetch (handles pagination) ────────────────────────────────────────

async function notionQuery(databaseId: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let cursor: string | undefined;

  do {
    const body: Record<string, unknown> = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: NOTION_HEADERS,
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`Notion query failed: ${await res.text()}`);
    const data = await res.json();
    results.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return results;
}

// Fetch category select options from BD Gastos schema
async function fetchGastosCategories(): Promise<string[]> {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_EXPENSES_DB}`, {
    method: "GET",
    headers: NOTION_HEADERS,
  });

  if (!res.ok) {
    console.error("Failed to fetch BD Gastos schema:", await res.text());
    return [];
  }

  const db = await res.json();
  const catProp = (db.properties as Record<string, unknown>)?.["Categoría"] as Record<string, unknown> | undefined;
  if (!catProp) return [];

  // Support both "select" and "multi_select" property types
  const opts =
    (catProp.select as { options?: { name: string }[] })?.options ??
    (catProp.multi_select as { options?: { name: string }[] })?.options ??
    [];

  return opts.map((o: { name: string }) => o.name).filter(Boolean);
}

function getText(props: Record<string, unknown>, key: string): string {
  const prop = props[key] as Record<string, unknown> | undefined;
  if (!prop) return "";
  const type = prop.type as string;
  if (type === "title")     return ((prop.title as {plain_text:string}[]) ?? []).map(t => t.plain_text).join("").trim();
  if (type === "rich_text") return ((prop.rich_text as {plain_text:string}[]) ?? []).map(t => t.plain_text).join("").trim();
  return "";
}

// Composite identity for a project row. JSON keeps the two fields
// unambiguous even when a name itself contains the separator.
function projectKey(clientName: string, name: string): string {
  return JSON.stringify([clientName, name]);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  try {
    // 1. Fetch Notion data in parallel
    const [clientPages, projectPages, categories] = await Promise.all([
      notionQuery(NOTION_CLIENTS_DB),
      notionQuery(NOTION_PROJECTS_DB),
      fetchGastosCategories(),
    ]);

    // 2. Build client map: page_id → name
    const clientMap = new Map<string, string>();
    const projectToClient = new Map<string, string>();

    for (const page of clientPages) {
      const props = page.properties as Record<string, unknown>;
      const name  = getText(props, "Nombre empresa");
      if (!name) continue;
      clientMap.set(page.id as string, name);

      const proyRel = (props["Proyectos"] as {relation:{id:string}[]})?.relation ?? [];
      for (const rel of proyRel) {
        projectToClient.set(rel.id, name);
      }
    }

    // 3. Build projects list with client association
    const clientsToUpsert  = new Set<string>();
    const projectsToUpsert: { name: string; client_name: string }[] = [];

    for (const page of projectPages) {
      const props      = page.properties as Record<string, unknown>;
      const nombre     = getText(props, "Nombre del proyecto");
      if (!nombre) continue;

      const clientRel  = (props["Cliente"] as {relation:{id:string}[]})?.relation ?? [];
      const clientName = clientRel.length > 0
        ? clientMap.get(clientRel[0].id) ?? projectToClient.get(page.id as string)
        : projectToClient.get(page.id as string);

      if (!clientName) continue;

      clientsToUpsert.add(clientName);
      projectsToUpsert.push({ name: nombre, client_name: clientName });
    }

    for (const name of clientMap.values()) {
      clientsToUpsert.add(name);
    }

    // 4. Upsert into Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const clientRows = [...clientsToUpsert].map(name => ({ name }));
    const { error: cErr } = await supabase
      .from("clients")
      .upsert(clientRows, { onConflict: "name", ignoreDuplicates: true });
    if (cErr) throw cErr;

    const { error: pErr } = await supabase
      .from("projects")
      .upsert(projectsToUpsert, { onConflict: "name,client_name", ignoreDuplicates: true });
    if (pErr) throw pErr;

    // 5. Sync categories from BD Gastos
    let categoryCount = 0;
    if (categories.length > 0) {
      const catRows = categories.map(name => ({ name }));
      const { error: catErr } = await supabase
        .from("expense_categories")
        .upsert(catRows, { onConflict: "name", ignoreDuplicates: true });
      if (catErr) throw catErr;
      categoryCount = catRows.length;
    }

    // 6. Mirror deletions: drop anything Notion no longer has.
    //
    // Guard: if Notion came back empty the call most likely failed upstream
    // (bad token, API hiccup) rather than the databases genuinely being empty.
    // Deleting on that signal would wipe the whole table, so bail out instead.
    let deletedClients  = 0;
    let deletedProjects = 0;

    if (clientsToUpsert.size === 0) {
      console.warn("Notion returned zero clients — skipping deletions to avoid wiping the tables.");
    } else {
      const notionClients = clientsToUpsert;
      const notionProjects = new Set(
        projectsToUpsert.map(p => projectKey(p.client_name, p.name))
      );

      // Snapshot both tables before deleting anything, so the cascade from
      // clients -> projects is still visible in the counts we report back.
      const [{ data: dbClients, error: lcErr }, { data: dbProjects, error: lpErr }] =
        await Promise.all([
          supabase.from("clients").select("name"),
          supabase.from("projects").select("name, client_name"),
        ]);
      if (lcErr) throw lcErr;
      if (lpErr) throw lpErr;

      const staleClients = (dbClients ?? [])
        .map(r => r.name as string)
        .filter(name => !notionClients.has(name) && !DELETION_EXEMPT_CLIENTS.has(name));
      const staleClientSet = new Set(staleClients);

      const staleProjects = (dbProjects ?? []).filter(r => {
        const client = r.client_name as string;
        if (DELETION_EXEMPT_CLIENTS.has(client)) return false;
        return (
          staleClientSet.has(client) ||
          !notionProjects.has(projectKey(client, r.name as string))
        );
      });
      deletedProjects = staleProjects.length;

      if (staleClients.length > 0) {
        // projects.client_name cascades, so their projects go with them.
        const { error: dcErr } = await supabase.from("clients").delete().in("name", staleClients);
        if (dcErr) throw dcErr;
        deletedClients = staleClients.length;
      }

      // Whatever the cascade did not take: a composite primary key, so
      // PostgREST cannot express this as a single IN filter.
      for (const proj of staleProjects) {
        if (staleClientSet.has(proj.client_name as string)) continue;
        const { error: dpErr } = await supabase
          .from("projects")
          .delete()
          .eq("name", proj.name as string)
          .eq("client_name", proj.client_name as string);
        if (dpErr) throw dpErr;
      }
    }

    const summary = {
      synced_at:        new Date().toISOString(),
      clients:          clientRows.length,
      projects:         projectsToUpsert.length,
      categories:       categoryCount,
      deleted_clients:  deletedClients,
      deleted_projects: deletedProjects,
    };

    console.log("Sync complete:", summary);

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: JSON_HEADERS,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sync error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
});
