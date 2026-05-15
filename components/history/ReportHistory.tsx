"use client";

import { useState } from "react";
import { FileText, Trash2, Download, FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { formatCurrency, formatDays } from "@/lib/calculations";
import { exportReportToPDF } from "@/lib/export-pdf";
import { exportReportToExcel } from "@/lib/export-excel";
import type { Report } from "@/types";

function ReportRow({ report }: { report: Report }) {
  const { state, dispatch } = useStore();
  const [expanded, setExpanded] = useState(false);

  const user = state.users.find((u) => u.id === report.userId);
  const period = state.periods.find((p) => p.id === report.periodId);

  const handleDelete = () => {
    if (confirm("¿Eliminar este reporte del historial?")) {
      dispatch({ type: "DELETE_REPORT", payload: report.id });
    }
  };

  const handlePDF = async () => {
    if (!user || !period) return;
    await exportReportToPDF(report, user, period);
  };

  const handleExcel = async () => {
    if (!user || !period) return;
    await exportReportToExcel(report, user, period);
  };

  return (
    <div className="border-b border-white/5 last:border-0">
      <div
        className="grid cursor-pointer grid-cols-[24px_1fr_140px_100px_120px_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-[#475569]">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            {user?.name ?? "—"}
          </p>
          <p className="text-xs text-[#64748B]">{period?.name ?? "—"}</p>
        </div>
        <span className="text-xs text-[#94A3B8]">
          {new Date(report.submittedAt).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
        <span className="rounded bg-[#0296DF]/20 px-2 py-0.5 text-center text-xs font-semibold text-[#0296DF]">
          {formatDays(report.totalDays)} días
        </span>
        <span className="text-right text-xs font-semibold text-[#10B981]">
          {formatCurrency(report.totalExpenses)}
        </span>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePDF}
            title="Exportar PDF"
            className="h-7 w-7 text-[#64748B] hover:bg-[#0296DF]/10 hover:text-[#0296DF]"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExcel}
            title="Exportar Excel"
            className="h-7 w-7 text-[#64748B] hover:bg-[#10B981]/10 hover:text-[#10B981]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-7 w-7 text-[#64748B] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mx-4 mb-3 overflow-hidden rounded-lg border border-white/5 bg-[#ffffff04]">
          {/* Activities */}
          <div className="border-b border-white/5 px-4 py-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#64748B]">
              Actividades
            </p>
            <div className="space-y-1">
              {report.activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-[#94A3B8]">{a.description}</span>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-[#0296DF]/10 px-1.5 py-0.5 text-[#0296DF]">
                      {a.area}
                    </span>
                    <span className="font-medium text-white">
                      {formatDays(a.days)} días
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Expenses */}
          {report.expenses.length > 0 && (
            <div className="px-4 py-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#64748B]">
                Gastos
              </p>
              <div className="space-y-1">
                {report.expenses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-[#94A3B8]">{e.description}</span>
                    <div className="flex items-center gap-3">
                      {e.fileName && (
                        <span className="text-[#64748B]">{e.fileName}</span>
                      )}
                      <span className="font-medium text-[#10B981]">
                        {formatCurrency(e.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReportHistory() {
  const { state } = useStore();

  const sorted = [...state.reports].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="p-5">
      <div className="mb-5">
        <h2 className="text-base font-semibold tracking-wide text-white">
          HISTORIAL DE REPORTES
        </h2>
        <p className="text-xs text-[#64748B]">
          {sorted.length === 0
            ? "No hay reportes enviados aún"
            : `${sorted.length} reporte${sorted.length !== 1 ? "s" : ""} enviado${sorted.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-[#1E293B]" />
          <p className="text-sm text-[#475569]">
            Los reportes enviados aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          {/* Header */}
          <div className="grid grid-cols-[24px_1fr_140px_100px_120px_auto] gap-3 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
            <span />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
              Consultor / Período
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
              Fecha Envío
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
              Días
            </span>
            <span className="text-right text-xs font-medium uppercase tracking-wider text-[#64748B]">
              Gastos
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
              Acciones
            </span>
          </div>
          {sorted.map((r) => (
            <ReportRow key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
