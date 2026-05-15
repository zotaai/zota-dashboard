import type { Report, User, BillingPeriod } from "@/types";
import { formatCurrency, formatDays } from "./calculations";

export async function exportReportToExcel(
  report: Report,
  user: User,
  period: BillingPeriod
) {
  const { utils, writeFile } = await import("xlsx");

  const wb = utils.book_new();

  // ── Sheet 1: Actividades ──────────────────────────────────────────────────
  const actHeaders = ["Descripción de la Actividad", "Área", "Días"];
  const actRows = report.activities.map((a) => [
    a.description,
    a.area,
    a.days,
  ]);
  const actTotal = [["TOTAL", "", report.totalDays]];
  const actMeta = [
    [`Reporte Quincenal — ${period.name}`],
    [`Consultor: ${user.name}`],
    [
      `Enviado: ${new Date(report.submittedAt).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
    ],
    [],
    actHeaders,
    ...actRows,
    [],
    ...actTotal,
  ];

  const wsAct = utils.aoa_to_sheet(actMeta);
  wsAct["!cols"] = [{ wch: 50 }, { wch: 25 }, { wch: 10 }];
  utils.book_append_sheet(wb, wsAct, "Actividades");

  // ── Sheet 2: Gastos ───────────────────────────────────────────────────────
  if (report.expenses.length > 0) {
    const expHeaders = ["Descripción del Gasto", "Factura", "Monto (USD)"];
    const expRows = report.expenses.map((e) => [
      e.description,
      e.fileName ?? "—",
      e.amount,
    ]);
    const expTotal = [["TOTAL GASTOS", "", report.totalExpenses]];
    const expMeta = [
      [`Gastos — ${period.name}`],
      [`Consultor: ${user.name}`],
      [],
      expHeaders,
      ...expRows,
      [],
      ...expTotal,
    ];

    const wsExp = utils.aoa_to_sheet(expMeta);
    wsExp["!cols"] = [{ wch: 50 }, { wch: 30 }, { wch: 15 }];
    utils.book_append_sheet(wb, wsExp, "Gastos");
  }

  // ── Sheet 3: Resumen ──────────────────────────────────────────────────────
  const summary = [
    ["ZOTA AI CONSULTING — REPORTE QUINCENAL"],
    [],
    ["Consultor", user.name],
    ["Período", period.name],
    ["Fecha de envío", new Date(report.submittedAt).toLocaleDateString("es-MX")],
    ["Días laborables", report.totalDays],
    ["Total actividades", report.activities.length],
    ["Total gastos registrados", report.expenses.length],
    ["Monto total de gastos", formatCurrency(report.totalExpenses)],
  ];
  const wsSummary = utils.aoa_to_sheet(summary);
  wsSummary["!cols"] = [{ wch: 30 }, { wch: 40 }];
  utils.book_append_sheet(wb, wsSummary, "Resumen");

  writeFile(
    wb,
    `Reporte_${user.name.replace(/\s+/g, "_")}_${period.name.replace(/\s+/g, "_")}.xlsx`
  );
}

export async function exportAllReportsToExcel(
  reports: Report[],
  users: User[],
  periods: BillingPeriod[]
) {
  const { utils, writeFile } = await import("xlsx");

  const wb = utils.book_new();

  const headers = [
    "ID Reporte",
    "Consultor",
    "Período",
    "Fecha Envío",
    "Días Registrados",
    "Nº Actividades",
    "Nº Gastos",
    "Total Gastos (USD)",
  ];

  const rows = reports.map((r) => {
    const u = users.find((x) => x.id === r.userId);
    const p = periods.find((x) => x.id === r.periodId);
    return [
      r.id,
      u?.name ?? "—",
      p?.name ?? "—",
      new Date(r.submittedAt).toLocaleDateString("es-MX"),
      r.totalDays,
      r.activities.length,
      r.expenses.length,
      r.totalExpenses,
    ];
  });

  const ws = utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  utils.book_append_sheet(wb, ws, "Todos los reportes");

  writeFile(wb, `Zota_Reportes_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
