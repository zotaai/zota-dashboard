// Supabase Edge Function: sync-to-notion
// Triggered via Database Webhook on the `reports` table (UPDATE).
// When a report's status changes to "submitted":
//   • Activities → Notion "Registros de Dedicaciones" (NOTION_DATABASE_ID)
//   • Expenses   → Notion "BD Gastos"                 (NOTION_EXPENSES_DB_ID)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOTION_TOKEN       = Deno.env.get("NOTION_TOKEN")!;
const NOTION_DB_ID       = Deno.env.get("NOTION_DATABASE_ID")!;       // Registros de Dedicaciones
const NOTION_EXPENSES_DB = Deno.env.get("NOTION_EXPENSES_DB_ID")!;    // BD Gastos
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY       = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// ── Activities ─────────────────────────────────────────────────────────────────

function buildActivityProperties(
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

async function findPageByActivityId(activityId: string): Promise<string | null> {
  const res = await fetch(`${NOTION_API}/databases/${NOTION_DB_ID}/query`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({
      filter: { property: "ID Actividad", rich_text: { equals: activityId } },
      page_size: 1,
    }),
  });
  if (!res.ok) { console.error("Notion activity query error:", await res.text()); return null; }
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

async function upsertActivityPage(
  properties: Record<string, unknown>,
  existingPageId: string | null,
): Promise<boolean> {
  if (existingPageId) {
    const res = await fetch(`${NOTION_API}/pages/${existingPageId}`, {
      method: "PATCH",
      headers: notionHeaders(),
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) console.error("Notion activity PATCH error:", await res.text());
    return res.ok;
  } else {
    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({ parent: { database_id: NOTION_DB_ID }, properties }),
    });
    if (!res.ok) console.error("Notion activity POST error:", await res.text());
    return res.ok;
  }
}

// ── Expenses ───────────────────────────────────────────────────────────────────

function buildExpenseProperties(
  expense:      { description: string; client: string; project: string; amount: number },
  userName:     string,
  submittedAt:  string,
) {
  return {
    "Concepto":          { title:     richText(expense.description ?? "") },
    "Cliente":           { rich_text: richText(expense.client  ?? "") },
    "Proyecto asociado": { rich_text: richText(expense.project ?? "") },
    "Monto":             { number:    Number(expense.amount) ?? 0 },
    "Proveedor":         { rich_text: richText(userName) },
    "Fecha":             { date:      { start: submittedAt.split("T")[0] } },
  };
}

async function createExpensePage(properties: Record<string, unknown>): Promise<boolean> {
  const res = await fetch(`${NOTION_API}/pages`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify({ parent: { database_id: NOTION_EXPENSES_DB }, properties }),
  });
  if (!res.ok) console.error("Notion expense POST error:", await res.text());
  return res.ok;
}

// ── Main handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: {
    type: string;
    record: { id: string; user_id: string; period_id: string; status: string; submitted_at?: string };
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
    { data: expensesData,   error: expErr },
    { data: userData,       error: usrErr },
    { data: periodData,     error: perErr },
  ] = await Promise.all([
    supabase
      .from("activities")
      .select("id, description, client, project, days")
      .eq("report_id", record.id),
    supabase
      .from("expenses")
      .select("id, description, client, project, amount")
      .eq("report_id", record.id),
    supabase.from("users").select("name").eq("id", record.user_id).single(),
    supabase.from("periods").select("name").eq("id", record.period_id).single(),
  ]);

  if (actErr) console.error("Error fetching activities:", actErr);
  if (expErr) console.error("Error fetching expenses:", expErr);
  if (usrErr) console.error("Error fetching user:", usrErr);
  if (perErr) console.error("Error fetching period:", perErr);

  const userName    = userData?.name   ?? record.user_id;
  const periodName  = periodData?.name ?? record.period_id;
  const submittedAt = record.submitted_at ?? new Date().toISOString();
  const activities  = activitiesData ?? [];
  const expenses    = expensesData   ?? [];

  // ── Sync activities to Registros de Dedicaciones ────────────────────────────
  const activityResults: { id: string; ok: boolean }[] = [];

  for (const activity of activities) {
    const properties     = buildActivityProperties(activity, userName, periodName, record.id);
    const existingPageId = await findPageByActivityId(activity.id);
    const ok             = await upsertActivityPage(properties, existingPageId);
    activityResults.push({ id: activity.id, ok });
    console.log(`Activity ${activity.id}: ${ok ? "synced" : "FAILED"}`);
  }

  // ── Sync expenses to BD Gastos ──────────────────────────────────────────────
  const expenseResults: { id: string; ok: boolean }[] = [];

  for (const expense of expenses) {
    const properties = buildExpenseProperties(expense, userName, submittedAt);
    const ok         = await createExpensePage(properties);
    expenseResults.push({ id: expense.id, ok });
    console.log(`Expense ${expense.id}: ${ok ? "synced" : "FAILED"}`);
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  const failedAct = activityResults.filter(r => !r.ok);
  const failedExp = expenseResults.filter(r => !r.ok);

  const summary = {
    reportId:          record.id,
    activitiesSynced:  activityResults.length - failedAct.length,
    expensesSynced:    expenseResults.length  - failedExp.length,
    failedActivities:  failedAct,
    failedExpenses:    failedExp,
  };

  console.log("Sync summary:", summary);

  const hasFailures = failedAct.length > 0 || failedExp.length > 0;
  return new Response(JSON.stringify(summary), { status: hasFailures ? 207 : 200 });
});
