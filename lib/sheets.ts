/**
 * The "Registro de Dedicaciones" spreadsheet that submitted activities are
 * mirrored into. The id also lives in the Apps Script that writes to it
 * (scripts/apps-script-dedicaciones.gs) and in the Edge Function's
 * SHEETS_WEBAPP_URL target; change all three together.
 */
export const DEDICATIONS_SHEET_ID =
  "1C0Ej9xtjyZevHVRrgPYYESy3i0W02nRxlfCMHtNumdw";

export const DEDICATIONS_SHEET_URL =
  `https://docs.google.com/spreadsheets/d/${DEDICATIONS_SHEET_ID}/edit`;
