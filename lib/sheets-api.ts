import type { AppState, User, BillingPeriod, Report } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_SHEETS_API_URL ?? "";

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

async function get<T>(): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_SHEETS_API_URL is not set");
  const res = await fetch(API_URL, { cache: "no-store" });
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error((json as { ok: false; error: string }).error);
  return (json as { ok: true; data: T }).data;
}

async function post<T>(body: Record<string, unknown>): Promise<T> {
  if (!API_URL) throw new Error("NEXT_PUBLIC_SHEETS_API_URL is not set");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" }, // avoids CORS preflight
    body: JSON.stringify(body),
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) throw new Error((json as { ok: false; error: string }).error);
  return (json as { ok: true; data: T }).data;
}

// ── Read ─────────────────────────────────────────────────────────────────────

export async function fetchAllData(): Promise<AppState> {
  return get<AppState>();
}

// ── Users ────────────────────────────────────────────────────────────────────

export const addUser    = (user: User)    => post<User>   ({ action: "addUser",    user });
export const updateUser = (user: User)    => post<User>   ({ action: "updateUser", user });
export const deleteUser = (id: string)   => post<{ id: string }>({ action: "deleteUser", id });

// ── Periods ──────────────────────────────────────────────────────────────────

export const addPeriod    = (period: BillingPeriod) => post<BillingPeriod>({ action: "addPeriod",    period });
export const updatePeriod = (period: BillingPeriod) => post<BillingPeriod>({ action: "updatePeriod", period });
export const deletePeriod = (id: string)            => post<{ id: string }>({ action: "deletePeriod", id });

// ── Areas ────────────────────────────────────────────────────────────────────

export const addArea    = (area: string) => post<string>({ action: "addArea",    area });
export const deleteArea = (area: string) => post<string>({ action: "deleteArea", area });

// ── Reports ──────────────────────────────────────────────────────────────────

export const submitReport = (report: Report)  => post<Report>     ({ action: "submitReport", report });
export const deleteReport = (id: string)      => post<{ id: string }>({ action: "deleteReport", id });
