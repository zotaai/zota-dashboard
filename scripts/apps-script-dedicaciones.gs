/**
 * Apps Script web app for the "Registro de Dedicaciones" spreadsheet.
 *
 * Receives activities from the Supabase `sync-to-notion` Edge Function and
 * upserts them into the sheet, keyed on "ID Actividad" (column G) so that
 * resubmitting a report rewrites its rows instead of duplicating them.
 *
 * SETUP
 *   1. Paste this file into Apps Script. The project does not have to be
 *      bound to the spreadsheet: it opens it by id.
 *   2. Configuración del proyecto -> Propiedades del script -> add
 *      SHARED_SECRET with a long random value.
 *   3. Implementar -> Nueva implementación -> Aplicación web
 *        Ejecutar como:      Yo
 *        Quién tiene acceso: Cualquier usuario
 *      Copy the /exec URL.
 *   4. In Supabase set SHEETS_WEBAPP_URL to that URL and SHEETS_WEBAPP_SECRET
 *      to the same value as SHARED_SECRET.
 *
 * "Cualquier usuario" is required because Supabase cannot present a Google
 * login. The URL is therefore not a secret on its own, which is why every
 * request must carry SHARED_SECRET.
 */

// Opened by id rather than SpreadsheetApp.getActive(), so the script works
// whether or not the project is bound to the spreadsheet.
var SPREADSHEET_ID = '1C0Ej9xtjyZevHVRrgPYYESy3i0W02nRxlfCMHtNumdw';
var SHEET_NAME     = 'Registros de Dedicaciones';
var HEADER_ROWS    = 1;
var ID_COLUMN      = 7;  // G — ID Actividad
var LAST_COLUMN    = 8;  // H — Reporte ID

function doPost(e) {
  var lock = LockService.getScriptLock();

  try {
    var expected = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!expected) return respond({ ok: false, error: 'SHARED_SECRET is not configured' });

    if (!e || !e.postData || !e.postData.contents) {
      return respond({ ok: false, error: 'empty request body' });
    }

    var body = JSON.parse(e.postData.contents);
    if (body.secret !== expected) return respond({ ok: false, error: 'unauthorized' });

    var activities = body.activities || [];
    if (!activities.length) return respond({ ok: true, updated: 0, appended: 0 });

    // Serialise concurrent submissions so two reports cannot append onto the
    // same row.
    lock.waitLock(30000);

    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return respond({ ok: false, error: 'sheet not found: ' + SHEET_NAME });

    var rowById = readIdIndex(sheet);
    var updated = 0;
    var appends = [];

    for (var i = 0; i < activities.length; i++) {
      var row = buildRow(activities[i], body.userName, body.periodName, body.reportId);
      var at  = rowById[String(activities[i].id)];

      if (at) {
        sheet.getRange(at, 1, 1, LAST_COLUMN).setValues([row]);
        updated++;
      } else {
        appends.push(row);
      }
    }

    if (appends.length) {
      var start = sheet.getLastRow() + 1;
      sheet.getRange(start, 1, appends.length, LAST_COLUMN).setValues(appends);
    }

    SpreadsheetApp.flush();
    return respond({ ok: true, updated: updated, appended: appends.length });

  } catch (err) {
    return respond({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** Map every existing "ID Actividad" to its 1-based row number. */
function readIdIndex(sheet) {
  var last = sheet.getLastRow();
  var index = {};
  if (last <= HEADER_ROWS) return index;

  var values = sheet.getRange(HEADER_ROWS + 1, ID_COLUMN, last - HEADER_ROWS, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0]).trim();
    if (id) index[id] = HEADER_ROWS + 1 + i;
  }
  return index;
}

/** Column order: Periodo | Usuario | Cliente | Proyecto | Descripción | Días | ID Actividad | Reporte ID */
function buildRow(activity, userName, periodName, reportId) {
  return [
    periodName || '',
    userName   || '',
    activity.client      || '',
    activity.project     || '',
    activity.description || '',
    Number(activity.days) || 0,
    String(activity.id),
    String(reportId),
  ];
}

function respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
