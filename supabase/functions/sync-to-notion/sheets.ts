// Google Sheets writer for the "Registro de Dedicaciones" spreadsheet.
//
// Activities used to land in a Notion database; they now go to a sheet instead.
//
// Writes go through an Apps Script web app bound to the spreadsheet rather than
// the Sheets REST API, because the zotaaiconsulting.com organization blocks
// service account keys (org policy iam.disableServiceAccountKeyCreation), and
// that API has no other unattended auth path we can use from here.
//
// The web app must be reachable without a Google login, so the URL alone is not
// a credential: every request carries a shared secret the script verifies. Set
// both SHEETS_WEBAPP_URL and SHEETS_WEBAPP_SECRET as Edge Function secrets.

export interface ActivityRow {
  id:          string;
  description: string;
  client:      string;
  project:     string;
  days:        number;
}

/**
 * Upsert activities into the sheet, keyed on "ID Actividad".
 *
 * Resubmitting a report must not duplicate its rows, so the script rewrites
 * existing ids in place and only appends genuinely new ones.
 */
export async function syncActivitiesToSheet(
  activities: ActivityRow[],
  userName:   string,
  periodName: string,
  reportId:   string,
): Promise<{ updated: number; appended: number }> {
  if (activities.length === 0) return { updated: 0, appended: 0 };

  const url    = Deno.env.get("SHEETS_WEBAPP_URL");
  const secret = Deno.env.get("SHEETS_WEBAPP_SECRET");
  if (!url)    throw new Error("SHEETS_WEBAPP_URL is not set");
  if (!secret) throw new Error("SHEETS_WEBAPP_SECRET is not set");

  const res = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      secret,
      userName,
      periodName,
      reportId,
      activities: activities.map(a => ({
        id:          a.id,
        description: a.description ?? "",
        client:      a.client      ?? "",
        project:     a.project     ?? "",
        days:        Number(a.days) || 0,
      })),
    }),
  });

  // Apps Script answers 200 even for handled errors, so the body is what counts.
  const text = await res.text();
  if (!res.ok) throw new Error(`Sheet web app HTTP ${res.status}: ${text.slice(0, 300)}`);

  let data: { ok?: boolean; error?: string; updated?: number; appended?: number };
  try {
    data = JSON.parse(text);
  } catch {
    // A login page instead of JSON means the deployment is not public.
    throw new Error(`Sheet web app returned non-JSON (check its access setting): ${text.slice(0, 300)}`);
  }

  if (!data.ok) throw new Error(`Sheet web app error: ${data.error ?? "unknown"}`);

  return { updated: data.updated ?? 0, appended: data.appended ?? 0 };
}
