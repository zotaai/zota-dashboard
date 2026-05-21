// Supabase Edge Function: sync-from-notion
// Reads BD Clientes + BD Proyectos from Notion and upserts into Supabase.
// Called manually (button) or automatically (pg_cron every hour).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTION_TOKEN      = Deno.env.get("NOTION_TOKEN")!;
const NOTION_CLIENTS_DB = "1517571d-e218-8251-baf7-0190ea987c13"; // BD Clientes
const NOTION_PROJECTS_DB= "1157571d-e218-8367-b1a2-01b847034157"; // BD Proyectos
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY      = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NOTION_HEADERS = {
  "Authorization": `Bearer ${NOTION_TOKEN}`,
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json",
};

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
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 1. Fetch Notion data in parallel
    const [clientPages, projectPages] = await Promise.all([
      notionQuery(NOTION_CLIENTS_DB),
      notionQuery(NOTION_PROJECTS_DB),
    ]);

    // 2. Build client map: page_id → name
    const clientMap = new Map<string, string>();
    const projectToClient = new Map<string, string>(); // project page_id → client name

    for (const page of clientPages) {
      const props = page.properties as Record<string, unknown>;
      const name  = getText(props, "Nombre empresa");
      if (!name) continue;
      clientMap.set(page.id as string, name);

      // Also map via the Proyectos relation (reverse lookup)
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

      // Try relation on project side first, then reverse map
      const clientRel  = (props["Cliente"] as {relation:{id:string}[]})?.relation ?? [];
      const clientName = clientRel.length > 0
        ? clientMap.get(clientRel[0].id) ?? projectToClient.get(page.id as string)
        : projectToClient.get(page.id as string);

      if (!clientName) continue; // skip projects without a client

      clientsToUpsert.add(clientName);
      projectsToUpsert.push({ name: nombre, client_name: clientName });
    }

    // Add all clients (even those without projects yet)
    for (const name of clientMap.values()) {
      clientsToUpsert.add(name);
    }

    // 4. Upsert into Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const clientRows   = [...clientsToUpsert].map(name => ({ name }));
    const { error: cErr } = await supabase
      .from("clients")
      .upsert(clientRows, { onConflict: "name", ignoreDuplicates: true });
    if (cErr) throw cErr;

    const { error: pErr } = await supabase
      .from("projects")
      .upsert(projectsToUpsert, { onConflict: "name,client_name", ignoreDuplicates: true });
    if (pErr) throw pErr;

    const summary = {
      synced_at: new Date().toISOString(),
      clients:   clientRows.length,
      projects:  projectsToUpsert.length,
    };

    console.log("Sync complete:", summary);

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sync error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
