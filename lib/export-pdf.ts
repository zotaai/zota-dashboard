import type { Report, User, BillingPeriod } from "@/types";
import { formatCurrency, formatDays } from "./calculations";

// jspdf-autotable adds lastAutoTable to the jsPDF instance after each call
interface JsPDFWithAutoTable {
  lastAutoTable: { finalY: number };
}

const BRAND = {
  navy: [12, 17, 46] as [number, number, number],
  blue: [2, 150, 223] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [241, 245, 249] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  green: [16, 185, 129] as [number, number, number],
};

export async function exportReportToPDF(
  report: Report,
  user: User,
  period: BillingPeriod
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, pageW, 42, "F");

  doc.setFillColor(...BRAND.blue);
  doc.circle(margin + 8, 21, 8, "F");
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Z", margin + 5.2, 24.8);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Zota AI Consulting", margin + 20, 18);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.blue);
  doc.text("TIME & EXPENSE TRACKING", margin + 20, 25);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.white);
  doc.text("REPORTE QUINCENAL", pageW - margin, 18, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...BRAND.blue);
  doc.text(
    new Date(report.submittedAt).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    pageW - margin,
    25,
    { align: "right" }
  );

  // ── Meta cards ───────────────────────────────────────────────────────────
  let y = 52;

  const drawCard = (x: number, cardY: number, w: number, label: string, value: string) => {
    doc.setFillColor(...BRAND.lightGray);
    doc.roundedRect(x, cardY, w, 16, 2, 2, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text(label.toUpperCase(), x + 4, cardY + 6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.text);
    doc.text(value, x + 4, cardY + 13);
  };

  const cardW = (pageW - margin * 2 - 6) / 3;
  drawCard(margin, y, cardW, "Consultor", user.name);
  drawCard(margin + cardW + 3, y, cardW, "Período", period.name);
  drawCard(margin + (cardW + 3) * 2, y, cardW, "Días Laborables", `${report.totalDays} días`);
  y += 24;

  doc.setFillColor(...BRAND.blue);
  doc.rect(margin, y, pageW - margin * 2, 0.5, "F");
  y += 6;

  // ── Activities table ──────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BRAND.navy);
  doc.text("REGISTRO DE DEDICACIONES", margin, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Descripción de la Actividad", "Cliente", "Proyecto", "Días"]],
    body: report.activities.map((a) => [a.description, a.client, a.project, formatDays(a.days)]),
    foot: [[{ content: "TOTAL", colSpan: 3, styles: { halign: "right" } }, formatDays(report.totalDays)]],
    headStyles: { fillColor: BRAND.navy, textColor: BRAND.white, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: BRAND.text },
    footStyles: { fillColor: BRAND.blue, textColor: BRAND.white, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: BRAND.lightGray },
    columnStyles: { 3: { halign: "center", cellWidth: 20 } },
  });

  y = (doc as unknown as JsPDFWithAutoTable).lastAutoTable.finalY + 10;

  // ── Expenses table ────────────────────────────────────────────────────────
  if (report.expenses.length > 0) {
    if (y > pageH - 80) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND.navy);
    doc.text("REGISTRO DE GASTOS", margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Descripción del Gasto", "Categoría", "Cliente", "Proyecto", "Fecha", "Monto (USD)"]],
      body: report.expenses.map((e) => [e.description, e.category || "—", e.client || "—", e.project || "—", e.expenseDate || "—", formatCurrency(e.amount)]),
      foot: [[{ content: "TOTAL GASTOS", colSpan: 5, styles: { halign: "right" } }, formatCurrency(report.totalExpenses)]],
      headStyles: { fillColor: BRAND.navy, textColor: BRAND.white, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: BRAND.text },
      footStyles: { fillColor: BRAND.green, textColor: BRAND.white, fontStyle: "bold", fontSize: 8 },
      alternateRowStyles: { fillColor: BRAND.lightGray },
      columnStyles: { 4: { halign: "right", cellWidth: 35 } },
    });
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND.navy);
    doc.rect(0, pageH - 12, pageW, 12, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND.gray);
    doc.text("© 2026 Zota AI Consulting — Elite AI B2B Solutions", margin, pageH - 4);
    doc.text(`Pág. ${i} / ${totalPages}`, pageW - margin, pageH - 4, { align: "right" });
  }

  doc.save(`Reporte_${user.name.replace(/\s+/g, "_")}_${period.name.replace(/\s+/g, "_")}.pdf`);
}
