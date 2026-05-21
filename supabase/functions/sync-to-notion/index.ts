// Supabase Edge Function: sync-to-notion
// Triggered via Database Webhook on the `reports` table (UPDATE).
// When a report's status changes to "submitted", all its activities are
// upserted into the Notion "Registros de Dedicaciones" database.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTION_TOKEN  = Deno.env.get("NOTION_TOKEN")!;
const NOTION_DB_ID  = Deno.env.get("NOTION_DATABASE_ID")!;
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NOTION_API     = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ── Notion helpers ─────────────────────────────────────────────────────────────

function notionHeaders() {
  return {
    "Authorization": `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

function richText(content: string) {
  return [{ type: "text", text: { content: String(content ?? "") } }];
}

// Build Notion page properties for one activity
function buildProperties(
  activity:   { id: string; description: string; client: string; project: string; days: number },
  userName:   string,
  periodName: string,
  reportId:   string,
) {
  return {
    "Descripción":  { title:     richText(activity.description ?? "") },
    "ID Actividad": { rich_text: richText(activity.id) },
    "Cliente":      { rich_text: richText(activity.client  ?? "") },
    "Proyecto":     { rich_text: richText(activity.project ?? "") },
    "Días":         { number:    Number(activity.days) ?? 0 },
    "Usuario":      { rich_text: richText(userName) },
    "Reporte ID":   { rich_text: richText(reportId) },
    "Periodo":      { rich_text: richText(periodName) },
  };
}

// Search for an existing Notion page by activity ID (to update instead of duplicate)
async function findPageByActivityId(activityId: string): Promise<string | null> {
  const res = await fetch(`${NOTION_API}/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: {
        property: "ID Actividad",
        rich_text: { equals: activityId },
      },
      page_size: 1,
    }),
  });

  if (!res.ok) {
    console.error("Notion query error:", await res.text());
    return null;
  }
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

async function upsertNotionPage(
  properties: Record<string, unknown>,
  existingPageId: string | null,
): Promise<boolean> {
  if (existingPageId) {
    const res = await fetch(`${NOTION_API}/pages/${existingPageId}`, {
      method: "PATCH",
      headers: notionHeaders(),
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) console.error("Notion PATCH error:", await res.text());
    return res.ok;
  } else {
    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties,
      }),
    });
    if (!res.ok) console.error("Notion POST error:", await res.text());
    return res.ok;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Supabase DB webhook payload shape:
  // { type, table, schema, record: { ...new row... }, old_record: { ...old row... } }
  let payload: {
    type: string;
    record: {
      id: string;
      user_id: string;
      period_id: string;
      status: string;
    };
    old_record?: { status?: string };
  };

  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  const { record, old_record } = payload;

  console.log(`Webhook received: report ${record.id}, status: ${old_record?.status} → ${record.status}`);

  // Only fire when the report transitions TO "submitted"
  if (record.status !== "submitted") {
    return new Response(JSON.stringify({ skipped: "not submitted" }), { status: 200 });
  }
  if (old_record?.status === "submitted") {
    return new Response(JSON.stringify({ skipped: "already was submitted" }), { status: 200 });
  }

  // ── Fetch related data from Supabase ────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const [
    { data: activitiesData, error: actErr },
    { data: userData,       error: usrErr },
    { data: periodData,     error: perErr },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, description, client, project, days")
      .eq("report_id", record.id),
    supabase.from("users").select("name").eq("id", record.user_id).single(),
    supabase.from("periods").select("name").eq("id", record.period_id).single(),
  ]);

  if (actErr) console.error("Error fetching activities:", actErr);
  if (usrErr) console.error("Error fetching user:", usrErr);
  if (perErr) console.error("Error fetching period:", perErr);

  const userName   = userData?.name   ?? record.user_id;
  const periodName = periodData?.name ?? record.period_id;
  const activities = activitiesData   ?? [];

  if (activities.length === 0) {
    return new Response(
      JSON.stringify({ message: "No activities found for report", reportId: record.id }),
      { status: 200 },
    );
  }

  // ── Sync each activity to Notion ────────────────────────────────────────────
  const results: { id: string; ok: boolean }[] = [];

  for (const activity of activities) {
    const properties     = buildProperties(activity, userName, periodName, record.id);
    const existingPageId = await findPageByActivityId(activity.id);
    const ok             = await upsertNotionPage(properties, existingPageId);
    results.push({ id: activity.id, ok });
    console.log(`Activity ${activity.id}: ${ok ? "synced" : "FAILED"}`);
  }

  const failed = results.filter(r => !r.ok);

  if (failed.length > 0) {
    return new Response(
      JSON.stringify({ message: "Partial failure", synced: results.length - failed.length, failed }),
      { status: 207 },
    );
  }

  return new Response(
    JSON.stringify({ message: "All synced", count: results.length, reportId: record.id }),
    { status: 200 },
  );
});
