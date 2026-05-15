import { supabase } from "./supabase";
import type { AppState, User, BillingPeriod, Report, Activity, Expense, Project } from "@/types";

// ── Mappers: DB (snake_case) → App (camelCase) ────────────────────────────────

function mapPeriod(r: Record<string, unknown>): BillingPeriod {
  return {
    id:        r.id as string,
    name:      r.name as string,
    startDate: r.start_date as string,
    endDate:   r.end_date as string,
  };
}

function mapActivity(r: Record<string, unknown>): Activity {
  return {
    id:          r.id as string,
    description: r.description as string,
    client:      (r.client as string) ?? "",
    project:     (r.project as string) ?? "",
    days:        Number(r.days),
  };
}

function mapExpense(r: Record<string, unknown>): Expense {
  return {
    id:          r.id as string,
    description: r.description as string,
    amount:      Number(r.amount),
    fileName:    (r.file_name as string) ?? null,
    fileData:    (r.file_data as string) ?? null,
  };
}

function mapReport(r: Record<string, unknown>): Report {
  return {
    id:            r.id as string,
    userId:        r.user_id as string,
    periodId:      r.period_id as string,
    submittedAt:   r.submitted_at as string,
    totalDays:     Number(r.total_days),
    totalExpenses: Number(r.total_expenses),
    activities:    ((r.activities as unknown[]) ?? []).map(a => mapActivity(a as Record<string, unknown>)),
    expenses:      ((r.expenses  as unknown[]) ?? []).map(e => mapExpense(e  as Record<string, unknown>)),
  };
}

// ── Read all data (single round-trip per table, parallel) ─────────────────────

export async function fetchAllData(): Promise<AppState> {
  const [usersRes, periodsRes, clientsRes, projectsRes, reportsRes] = await Promise.all([
    supabase.from("users").select("*").order("name"),
    supabase.from("periods").select("*").order("start_date"),
    supabase.from("clients").select("name").order("name"),
    supabase.from("projects").select("name, client_name").order("client_name").order("name"),
    supabase
      .from("reports")
      .select("*, activities(id,description,client,project,days), expenses(id,description,amount,file_name,file_data)")
      .order("submitted_at", { ascending: false }),
  ]);

  if (usersRes.error)    throw usersRes.error;
  if (periodsRes.error)  throw periodsRes.error;
  if (clientsRes.error)  throw clientsRes.error;
  if (projectsRes.error) throw projectsRes.error;
  if (reportsRes.error)  throw reportsRes.error;

  return {
    users:    (usersRes.data    ?? []) as User[],
    periods:  (periodsRes.data  ?? []).map(mapPeriod),
    clients:  (clientsRes.data  ?? []).map(r => r.name as string),
    projects: (projectsRes.data ?? []).map(r => ({
      name:       r.name as string,
      clientName: r.client_name as string,
    })),
    reports:  (reportsRes.data  ?? []).map(r => mapReport(r as Record<string, unknown>)),
  };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function addUser(user: User) {
  const { error } = await supabase.from("users").insert({ id: user.id, name: user.name });
  if (error) throw error;
}

export async function updateUser(user: User) {
  const { error } = await supabase.from("users").update({ name: user.name }).eq("id", user.id);
  if (error) throw error;
}

export async function deleteUser(id: string) {
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}

// ── Periods ───────────────────────────────────────────────────────────────────

export async function addPeriod(period: BillingPeriod) {
  const { error } = await supabase.from("periods").insert({
    id: period.id, name: period.name, start_date: period.startDate, end_date: period.endDate,
  });
  if (error) throw error;
}

export async function updatePeriod(period: BillingPeriod) {
  const { error } = await supabase.from("periods")
    .update({ name: period.name, start_date: period.startDate, end_date: period.endDate })
    .eq("id", period.id);
  if (error) throw error;
}

export async function deletePeriod(id: string) {
  const { error } = await supabase.from("periods").delete().eq("id", id);
  if (error) throw error;
}

// ── Clients ───────────────────────────────────────────────────────────────────

export async function addClient(name: string) {
  const { error } = await supabase.from("clients").insert({ name });
  if (error) throw error;
}

export async function deleteClient(name: string) {
  const { error } = await supabase.from("clients").delete().eq("name", name);
  if (error) throw error;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function addProject(project: Project) {
  const { error } = await supabase
    .from("projects")
    .insert({ name: project.name, client_name: project.clientName });
  if (error) throw error;
}

export async function deleteProject(project: Project) {
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("name", project.name)
    .eq("client_name", project.clientName);
  if (error) throw error;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function submitReport(report: Report) {
  const { error: rErr } = await supabase.from("reports").insert({
    id:             report.id,
    user_id:        report.userId,
    period_id:      report.periodId,
    submitted_at:   report.submittedAt,
    total_days:     report.totalDays,
    total_expenses: report.totalExpenses,
  });
  if (rErr) throw rErr;

  if (report.activities.length > 0) {
    const { error: aErr } = await supabase.from("activities").insert(
      report.activities.map(a => ({
        id: a.id, report_id: report.id, description: a.description,
        client: a.client, project: a.project, days: a.days,
      }))
    );
    if (aErr) throw aErr;
  }

  if (report.expenses.length > 0) {
    const { error: eErr } = await supabase.from("expenses").insert(
      report.expenses.map(e => ({
        id: e.id, report_id: report.id, description: e.description,
        amount: e.amount, file_name: e.fileName, file_data: e.fileData,
      }))
    );
    if (eErr) throw eErr;
  }
}

export async function deleteReport(id: string) {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}
