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

    const summary = {
      synced_at:  new Date().toISOString(),
      clients:    clientRows.length,
      projects:   projectsToUpsert.length,
      categories: categoryCount,
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
