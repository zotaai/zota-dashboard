import type { Report, User, BillingPeriod } from "@/types";
import { formatCurrency } from "./calculations";

// ── helpers ────────────────────────────────────────────────────────────────
async function getWorkbook() {
  const ExcelJS = (await import("exceljs")).default;
  return new ExcelJS.Workbook();
}

function styleHeaderRow(row: import("exceljs").Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0C112E" }, // Zota navy
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
}

function styleTitleRow(row: import("exceljs").Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, size: 13, color: { argb: "FF0296DF" } }; // Zota blue
  });
}

// ── single report ──────────────────────────────────────────────────────────
export async function exportReportToExcel(
  report: Report,
  user: User,
  period: BillingPeriod
) {
  const wb = await getWorkbook();
  wb.creator = "Zota AI Consulting";
  wb.created = new Date();

  // ── Sheet 1: Actividades ─────────────────────────────────────────────────
  const wsAct = wb.addWorksheet("Actividades");
  wsAct.columns = [
    { header: "", key: "desc",    width: 46 },
    { header: "", key: "client",  width: 22 },
    { header: "", key: "project", width: 22 },
    { header: "", key: "days",    width: 12 },
  ];

  const titleAct = wsAct.addRow([`Reporte Quincenal — ${period.name}`, "", ""]);
  styleTitleRow(titleAct);
  wsAct.addRow([`Consultor: ${user.name}`, "", ""]);
  wsAct.addRow([
    `Enviado: ${new Date(report.submittedAt).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    "",
    "",
  ]);
  wsAct.addRow([]);

  const hdrAct = wsAct.addRow(["Descripción de la Actividad", "Cliente", "Proyecto", "Días"]);
  styleHeaderRow(hdrAct);

  report.activities.forEach((a) => {
    wsAct.addRow([a.description, a.client, a.project, a.days]);
  });

  wsAct.addRow([]);
  const totalActRow = wsAct.addRow(["TOTAL", "", "", report.totalDays]);
  totalActRow.getCell(1).font = { bold: true };
  totalActRow.getCell(4).font = { bold: true };

  // ── Sheet 2: Gastos ──────────────────────────────────────────────────────
  if (report.expenses.length > 0) {
    const wsExp = wb.addWorksheet("Gastos");
    wsExp.columns = [
      { header: "", key: "desc",     width: 34 },
      { header: "", key: "category", width: 18 },
      { header: "", key: "client",   width: 20 },
      { header: "", key: "project",  width: 20 },
      { header: "", key: "date",     width: 14 },
      { header: "", key: "amount",   width: 16 },
    ];

    const titleExp = wsExp.addRow([`Gastos — ${period.name}`, "", "", "", ""]);
    styleTitleRow(titleExp);
    wsExp.addRow([`Consultor: ${user.name}`, "", "", "", ""]);
    wsExp.addRow([]);

    const hdrExp = wsExp.addRow([
      "Descripción del Gasto",
      "Categoría",
      "Cliente",
      "Proyecto",
      "Fecha",
      "Monto (USD)",
    ]);
    styleHeaderRow(hdrExp);

    report.expenses.forEach((e) => {
      const row = wsExp.addRow([e.description, e.category || "—", e.client || "—", e.project || "—", e.expenseDate || "—", e.amount]);
      row.getCell(6).numFmt = '"$"#,##0.00';
    });

    wsExp.addRow([]);
    const totalExpRow = wsExp.addRow([
      "TOTAL GASTOS",
      "", "", "", "",
      report.totalExpenses,
    ]);
    totalExpRow.getCell(1).font = { bold: true };
    totalExpRow.getCell(6).font = { bold: true };
    totalExpRow.getCell(6).numFmt = '"$"#,##0.00';
  }

  // ── Sheet 3: Resumen ─────────────────────────────────────────────────────
  const wsSummary = wb.addWorksheet("Resumen");
  wsSummary.columns = [
    { header: "", key: "label", width: 32 },
    { header: "", key: "value", width: 42 },
  ];

  const titleSum = wsSummary.addRow([
    "ZOTA AI CONSULTING — REPORTE QUINCENAL",
    "",
  ]);
  styleTitleRow(titleSum);
  wsSummary.addRow([]);

  const pairs: [string, string | number][] = [
    ["Consultor", user.name],
    ["Período", period.name],
    ["Fecha de envío", new Date(report.submittedAt).toLocaleDateString("es-MX")],
    ["Días laborables", report.totalDays],
    ["Total actividades", report.activities.length],
    ["Total gastos registrados", report.expenses.length],
    ["Monto total de gastos", formatCurrency(report.totalExpenses)],
  ];

  pairs.forEach(([label, value]) => {
    const r = wsSummary.addRow([label, value]);
    r.getCell(1).font = { bold: true };
  });

  // ── Download ─────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Reporte_${user.name.replace(/\s+/g, "_")}_${period.name.replace(/\s+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── all reports ────────────────────────────────────────────────────────────
export async function exportAllReportsToExcel(
  reports: Report[],
  users: User[],
  periods: BillingPeriod[]
) {
  const wb = await getWorkbook();
  wb.creator = "Zota AI Consulting";
  wb.created = new Date();

  const ws = wb.addWorksheet("Todos los reportes");
  ws.columns = [
    { header: "ID Reporte", key: "id", width: 24 },
    { header: "Consultor", key: "user", width: 24 },
    { header: "Período", key: "period", width: 22 },
    { header: "Fecha Envío", key: "date", width: 16 },
    { header: "Días Registrados", key: "days", width: 18 },
    { header: "Nº Actividades", key: "acts", width: 16 },
    { header: "Nº Gastos", key: "exps", width: 14 },
    { header: "Total Gastos (USD)", key: "total", width: 20 },
  ];

  styleHeaderRow(ws.getRow(1));

  reports.forEach((r) => {
    const u = users.find((x) => x.id === r.userId);
    const p = periods.find((x) => x.id === r.periodId);
    const row = ws.addRow({
      id: r.id,
      user: u?.name ?? "—",
      period: p?.name ?? "—",
      date: new Date(r.submittedAt).toLocaleDateString("es-MX"),
      days: r.totalDays,
      acts: r.activities.length,
      exps: r.expenses.length,
      total: r.totalExpenses,
    });
    row.getCell("total").numFmt = '"$"#,##0.00';
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Zota_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
