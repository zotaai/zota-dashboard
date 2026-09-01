// Google Sheets writer for the "Registro de Dedicaciones" spreadsheet.
//
// Activities used to land in a Notion database; they now go to a sheet instead.
// Auth is a Google service account: the sheet must be shared with the account's
// client_email as an Editor, and its JSON key stored in GOOGLE_SERVICE_ACCOUNT_JSON.

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_URL  = "https://oauth2.googleapis.com/token";
const SCOPE      = "https://www.googleapis.com/auth/spreadsheets";

// Column order in the sheet, left to right. Row 1 holds these as headers.
//   A Periodo | B Usuario | C Cliente | D Proyecto | E Descripción | F Días
//   G ID Actividad | H Reporte ID
const FIRST_COL = "A";
const LAST_COL  = "H";
const ID_COL    = "G"; // ID Actividad — the upsert key
const FIRST_DATA_ROW = 2;

export interface ActivityRow {
  id:          string;
  description: string;
  client:      string;
  project:     string;
  days:        number;
}

interface ServiceAccount {
  client_email: string;
  private_key:  string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(atob(body), c => c.charCodeAt(0));
}

// Cached for the lifetime of the isolate; tokens are good for an hour and a
// single webhook run never outlives that.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) return cachedToken.value;

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss:   sa.client_email,
    scope: SCOPE,
    aud:   TOKEN_URL,
    iat:   now,
    exp:   now + 3600,
  };

  const enc = new TextEncoder();
  const unsigned =
    base64url(enc.encode(JSON.stringify(header))) + "." +
    base64url(enc.encode(JSON.stringify(claims)));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(unsigned)),
  );
  const jwt = unsigned + "." + base64url(sig);

  const res = await fetch(TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);

  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: now + (data.expires_in ?? 3600) };
  return cachedToken.value;
}

// ── Sheet writes ──────────────────────────────────────────────────────────────

function buildRow(
  a: ActivityRow,
  userName: string,
  periodName: string,
  reportId: string,
): (string | number)[] {
  return [
    periodName,
    userName,
    a.client      ?? "",
    a.project     ?? "",
    a.description ?? "",
    Number(a.days) || 0,
    a.id,
    reportId,
  ];
}

/**
 * Upsert activities into the sheet, keyed on "ID Actividad".
 *
 * Resubmitting a report must not duplicate its rows, so existing ids are
 * rewritten in place and only genuinely new ones are appended.
 */
export async function syncActivitiesToSheet(
  activities: ActivityRow[],
  userName:   string,
  periodName: string,
  reportId:   string,
): Promise<{ updated: number; appended: number }> {
  if (activities.length === 0) return { updated: 0, appended: 0 };

  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set");
  const sa: ServiceAccount = JSON.parse(raw);

  const sheetId = Deno.env.get("GOOGLE_SHEETS_ID");
  if (!sheetId) throw new Error("GOOGLE_SHEETS_ID is not set");
  const tab = Deno.env.get("GOOGLE_SHEETS_TAB") ?? "Registros de Dedicaciones";

  const token   = await getAccessToken(sa);
  const authHdr = { Authorization: `Bearer ${token}` };
  const range   = (r: string) => `${encodeURIComponent(tab)}!${r}`;

  // Map existing activity ids to their 1-based row numbers.
  const idRes = await fetch(`${SHEETS_API}/${sheetId}/values/${range(`${ID_COL}:${ID_COL}`)}`, {
    headers: authHdr,
  });
  if (!idRes.ok) throw new Error(`Sheets read failed: ${await idRes.text()}`);

  const existing = new Map<string, number>();
  const idValues: string[][] = (await idRes.json()).values ?? [];
  idValues.forEach((cells, i) => {
    const id = (cells?.[0] ?? "").toString().trim();
    if (id) existing.set(id, i + 1); // i is 0-based over column G including the header
  });

  const updates: { range: string; values: (string | number)[][] }[] = [];
  const appends: (string | number)[][] = [];

  for (const a of activities) {
    const row = buildRow(a, userName, periodName, reportId);
    const at  = existing.get(a.id);
    if (at && at >= FIRST_DATA_ROW) {
      updates.push({ range: range(`${FIRST_COL}${at}:${LAST_COL}${at}`), values: [row] });
    } else {
      appends.push(row);
    }
  }

  if (updates.length > 0) {
    const res = await fetch(`${SHEETS_API}/${sheetId}/values:batchUpdate`, {
      method:  "POST",
      headers: { ...authHdr, "Content-Type": "application/json" },
      body:    JSON.stringify({ valueInputOption: "USER_ENTERED", data: updates }),
    });
    if (!res.ok) throw new Error(`Sheets batchUpdate failed: ${await res.text()}`);
  }

  if (appends.length > 0) {
    const url =
      `${SHEETS_API}/${sheetId}/values/${range(`${FIRST_COL}:${LAST_COL}`)}:append` +
      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
      method:  "POST",
      headers: { ...authHdr, "Content-Type": "application/json" },
      body:    JSON.stringify({ values: appends }),
    });
    if (!res.ok) throw new Error(`Sheets append failed: ${await res.text()}`);
  }

  return { updated: updates.length, appended: appends.length };
}
