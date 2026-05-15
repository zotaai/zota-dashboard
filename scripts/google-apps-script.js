/**
 * ZOTA AI — Google Apps Script Backend
 * ─────────────────────────────────────────────────────────────────────────────
 * INSTRUCCIONES DE INSTALACIÓN:
 *
 * 1. Abre tu Google Sheet en https://sheets.google.com
 * 2. Menú → Extensiones → Apps Script
 * 3. Borra el contenido por defecto y pega TODO este archivo
 * 4. Guarda (Ctrl+S) con el nombre "Zota Dashboard API"
 * 5. Menú → Implementar → Nueva implementación
 *    - Tipo: Aplicación web
 *    - Ejecutar como: Yo (tu cuenta)
 *    - Quién tiene acceso: Cualquier usuario
 * 6. Copia la URL de la implementación → es tu NEXT_PUBLIC_SHEETS_API_URL
 * 7. Haz clic en "Inicializar hojas" (botón en el menú personalizado) para
 *    crear la estructura de hojas automáticamente la primera vez.
 *
 * ESTRUCTURA DE HOJAS QUE SE CREA AUTOMÁTICAMENTE:
 *   • Usuarios  → id | name
 *   • Periodos  → id | name | startDate | endDate
 *   • Areas     → name
 *   • Reportes  → id | userId | periodId | submittedAt | totalDays | totalExpenses | activities | expenses
 * ─────────────────────────────────────────────────────────────────────────────
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

const SHEET = {
  USERS: "Usuarios",
  PERIODS: "Periodos",
  AREAS: "Areas",
  REPORTS: "Reportes",
};

// ── Entrypoints ───────────────────────────────────────────────────────────────

function doGet() {
  return jsonOk(getAllData());
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const { action } = payload;

  switch (action) {
    // ── Users ────────────────────────────────────────────────────────────────
    case "addUser":    return jsonOk(addRow(SHEET.USERS, payload.user));
    case "updateUser": return jsonOk(updateRow(SHEET.USERS, payload.user));
    case "deleteUser": return jsonOk(deleteRow(SHEET.USERS, payload.id));

    // ── Periods ──────────────────────────────────────────────────────────────
    case "addPeriod":    return jsonOk(addRow(SHEET.PERIODS, payload.period));
    case "updatePeriod": return jsonOk(updateRow(SHEET.PERIODS, payload.period));
    case "deletePeriod": return jsonOk(deleteRow(SHEET.PERIODS, payload.id));

    // ── Areas ────────────────────────────────────────────────────────────────
    case "addArea":    return jsonOk(addArea(payload.area));
    case "deleteArea": return jsonOk(deleteArea(payload.area));

    // ── Reports ──────────────────────────────────────────────────────────────
    case "submitReport": return jsonOk(submitReport(payload.report));
    case "deleteReport": return jsonOk(deleteRow(SHEET.REPORTS, payload.id));

    default:
      return jsonError("Unknown action: " + action);
  }
}

// ── Read all ─────────────────────────────────────────────────────────────────

function getAllData() {
  return {
    users:   getRows(SHEET.USERS),
    periods: getRows(SHEET.PERIODS),
    areas:   getAreas(),
    reports: getReports(),
  };
}

// ── Generic row helpers ───────────────────────────────────────────────────────

function getSheet(name) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) throw new Error("Sheet not found: " + name);
  return sheet;
}

function getRows(sheetName) {
  const sheet = getSheet(sheetName);
  const data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  return data.slice(1).map(row =>
    Object.fromEntries(headers.map((h, i) => [h, row[i]]))
  );
}

function addRow(sheetName, obj) {
  const sheet   = getSheet(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row     = headers.map(h => obj[h] ?? "");
  sheet.appendRow(row);
  return obj;
}

function updateRow(sheetName, obj) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf("id");

  for (let i = 1; i < data.length; i++) {
    if (data[i][idCol] === obj.id) {
      const row = headers.map(h => obj[h] ?? "");
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return obj;
    }
  }
  throw new Error("Row not found: " + obj.id);
}

function deleteRow(sheetName, id) {
  const sheet   = getSheet(sheetName);
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf("id");

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      return { id };
    }
  }
  return { id };
}

// ── Areas (single-column sheet) ───────────────────────────────────────────────

function getAreas() {
  const sheet = getSheet(SHEET.AREAS);
  const data  = sheet.getDataRange().getValues();
  return data.slice(1).map(r => r[0]).filter(Boolean);
}

function addArea(area) {
  const sheet = getSheet(SHEET.AREAS);
  sheet.appendRow([area]);
  return area;
}

function deleteArea(area) {
  const sheet = getSheet(SHEET.AREAS);
  const data  = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === area) {
      sheet.deleteRow(i + 1);
      return area;
    }
  }
  return area;
}

// ── Reports (activities and expenses stored as JSON strings) ──────────────────

function getReports() {
  const rows = getRows(SHEET.REPORTS);
  return rows.map(r => ({
    ...r,
    totalDays:     Number(r.totalDays),
    totalExpenses: Number(r.totalExpenses),
    activities:    safeJsonParse(r.activities, []),
    expenses:      safeJsonParse(r.expenses, []),
  }));
}

function submitReport(report) {
  const sheet   = getSheet(SHEET.REPORTS);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const flat    = {
    ...report,
    activities: JSON.stringify(report.activities),
    expenses:   JSON.stringify(report.expenses),
  };
  const row = headers.map(h => flat[h] ?? "");
  sheet.appendRow(row);
  return report;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Setup: creates sheet structure and seeds initial data ─────────────────────

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔧 Zota Dashboard")
    .addItem("Inicializar hojas", "setupSheets")
    .addToUi();
}

function setupSheets() {
  _createSheet(SHEET.USERS, ["id", "name"], [
    ["1", "Juan García"],
    ["2", "María López"],
    ["3", "Carlos Rodríguez"],
  ]);

  _createSheet(SHEET.PERIODS, ["id", "name", "startDate", "endDate"], [
    ["1", "1ra Quincena Mayo 2026", "2026-05-01", "2026-05-15"],
    ["2", "2da Quincena Mayo 2026", "2026-05-16", "2026-05-31"],
    ["3", "1ra Quincena Junio 2026", "2026-06-01", "2026-06-15"],
  ]);

  _createSheet(SHEET.AREAS, ["name"], [
    ["Proyectos"],
    ["Administración"],
    ["Marketing"],
    ["Contabilidad"],
    ["Comercial / Ventas"],
    ["I+D"],
  ]);

  _createSheet(
    SHEET.REPORTS,
    ["id", "userId", "periodId", "submittedAt", "totalDays", "totalExpenses", "activities", "expenses"],
    []
  );

  SpreadsheetApp.getUi().alert("✅ Hojas creadas correctamente. Ya puedes usar el dashboard.");
}

function _createSheet(name, headers, rows) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
  } else {
    sheet.clearContents();
  }

  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#0C112E")
    .setFontColor("#FFFFFF");

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}
