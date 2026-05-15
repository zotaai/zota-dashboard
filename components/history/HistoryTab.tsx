"use client";

import { useState, useMemo } from "react";
import { ClipboardList, Receipt, FileX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { BillingPeriod } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

type FilterType = "quincena" | "mes" | "trimestre" | "semestre" | "año";

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const QUARTERS   = ["Q1 (Ene–Mar)","Q2 (Abr–Jun)","Q3 (Jul–Sep)","Q4 (Oct–Dic)"];
const SEMESTERS  = ["S1 (Ene–Jun)","S2 (Jul–Dic)"];

function localDate(period: BillingPeriod): Date {
  const [y, m, d] = period.startDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// ── Component ──────────────────────────────────────────────────────────────────

export function HistoryTab() {
  const { state } = useStore();

  const [filterType,  setFilterType]  = useState<FilterType>("quincena");
  const [filterValue, setFilterValue] = useState<string>("all");

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getPeriod = (id: string) => state.periods.find(p => p.id === id);
  const getUser   = (id: string) => state.users.find(u => u.id === id);

  // Only submitted reports
  const submitted = useMemo(
    () => state.reports.filter(r => r.status === "submitted"),
    [state.reports]
  );

  // ── Build filter options from periods that actually have submitted reports ─
  const filterOptions = useMemo(() => {
    const periods = submitted
      .map(r => getPeriod(r.periodId))
      .filter((p): p is BillingPeriod => Boolean(p));

    const unique = <T extends { value: string }>(arr: T[]) => {
      const seen = new Set<string>();
      return arr.filter(x => (seen.has(x.value) ? false : (seen.add(x.value), true)));
    };

    switch (filterType) {
      case "quincena":
        return unique(periods.map(p => ({ value: p.id, label: p.name })));

      case "mes":
        return unique(
          periods.map(p => {
            const d = localDate(p);
            return {
              value: `${d.getFullYear()}-${d.getMonth()}`,
              label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`,
              sort: d.getFullYear() * 100 + d.getMonth(),
            };
          })
        ).sort((a, b) => a.sort - b.sort);

      case "trimestre":
        return unique(
          periods.map(p => {
            const d = localDate(p);
            const q = Math.floor(d.getMonth() / 3);
            return {
              value: `${d.getFullYear()}-Q${q}`,
              label: `${QUARTERS[q]} ${d.getFullYear()}`,
              sort: d.getFullYear() * 10 + q,
            };
          })
        ).sort((a, b) => a.sort - b.sort);

      case "semestre":
        return unique(
          periods.map(p => {
            const d = localDate(p);
            const s = d.getMonth() < 6 ? 0 : 1;
            return {
              value: `${d.getFullYear()}-S${s}`,
              label: `${SEMESTERS[s]} ${d.getFullYear()}`,
              sort: d.getFullYear() * 10 + s,
            };
          })
        ).sort((a, b) => a.sort - b.sort);

      case "año":
        return unique(
          periods.map(p => {
            const y = localDate(p).getFullYear().toString();
            return { value: y, label: y, sort: Number(y) };
          })
        ).sort((a, b) => a.sort - b.sort);
    }
  }, [filterType, submitted, state.periods]);

  // ── Apply filter ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filterValue === "all") return submitted;

    return submitted.filter(r => {
      const p = getPeriod(r.periodId);
      if (!p) return false;
      const d = localDate(p);

      switch (filterType) {
        case "quincena":  return r.periodId === filterValue;
        case "mes":       return `${d.getFullYear()}-${d.getMonth()}` === filterValue;
        case "trimestre": return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3)}` === filterValue;
        case "semestre":  return `${d.getFullYear()}-S${d.getMonth() < 6 ? 0 : 1}` === filterValue;
        case "año":       return `${d.getFullYear()}` === filterValue;
      }
    });
  }, [filterValue, filterType, submitted, state.periods]);

  // ── Flatten rows ───────────────────────────────────────────────────────────
  const activityRows = useMemo(() =>
    filtered.flatMap(r => {
      const userName   = getUser(r.userId)?.name   ?? "—";
      const periodName = getPeriod(r.periodId)?.name ?? "—";
      return r.activities.map(a => ({ ...a, userName, periodName }));
    }),
    [filtered, state.users, state.periods]
  );

  const expenseRows = useMemo(() =>
    filtered.flatMap(r => {
      const userName   = getUser(r.userId)?.name   ?? "—";
      const periodName = getPeriod(r.periodId)?.name ?? "—";
      return r.expenses.map(e => ({ ...e, userName, periodName }));
    }),
    [filtered, state.users, state.periods]
  );

  const totalDays     = activityRows.reduce((s, a) => s + a.days, 0);
  const totalExpenses = expenseRows.reduce((s, e) => s + e.amount, 0);

  const handleTypeChange = (v: string) => {
    setFilterType(v as FilterType);
    setFilterValue("all");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-5">

      {/* Header + filters */}
      <div>
        <h2 className="mb-0.5 text-base font-semibold tracking-wide text-white">
          REPORTES ENVIADOS
        </h2>
        <p className="mb-4 text-xs text-[#64748B]">
          Consulta los registros de dedicaciones y gastos de todos los reportes quincenales publicados.
        </p>

        <div className="flex flex-wrap gap-3">
          {/* Filter type */}
          <Select value={filterType} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 w-40 border-white/10 bg-white/5 text-sm text-white focus:border-[#0296DF]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quincena">Quincena</SelectItem>
              <SelectItem value="mes">Mes</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="semestre">Semestre</SelectItem>
              <SelectItem value="año">Año</SelectItem>
            </SelectContent>
          </Select>

          {/* Filter value */}
          <Select
            value={filterValue}
            onValueChange={setFilterValue}
            disabled={filterOptions.length === 0}
          >
            <SelectTrigger className="h-9 w-60 border-white/10 bg-white/5 text-sm text-white focus:border-[#0296DF]">
              <SelectValue placeholder="Todos los períodos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filterOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Empty state */}
      {submitted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-white/10 py-16 text-center">
          <FileX className="h-8 w-8 text-[#475569]" />
          <p className="text-sm text-[#475569]">Aún no hay reportes enviados.</p>
        </div>
      ) : (
        <>
          {/* ── Dedicaciones ── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#0296DF]" />
              <h3 className="text-sm font-semibold text-white">Registros de Dedicaciones</h3>
              <span className="ml-auto text-xs text-[#64748B]">
                {totalDays} {totalDays === 1 ? "día" : "días"} en total
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10">
              {/* Table header */}
              <div className="grid grid-cols-[150px_170px_1fr_120px_130px_64px] gap-2 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
                {["Usuario","Período","Descripción","Cliente","Proyecto","Días"].map(h => (
                  <span key={h} className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div className="max-h-96 divide-y divide-white/5 overflow-y-auto">
                {activityRows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#475569]">
                    Sin registros para el filtro seleccionado.
                  </div>
                ) : (
                  activityRows.map((a, i) => (
                    <div
                      key={`act-${a.id}-${i}`}
                      className="grid grid-cols-[150px_170px_1fr_120px_130px_64px] items-center gap-2 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="truncate text-xs text-[#CBD5E1]">{a.userName}</span>
                      <span className="truncate text-xs text-[#64748B]">{a.periodName}</span>
                      <span className="truncate text-xs text-[#94A3B8]">{a.description || "—"}</span>
                      <span className="truncate text-xs text-[#64748B]">{a.client || "—"}</span>
                      <span className="truncate text-xs text-[#64748B]">{a.project || "—"}</span>
                      <span className="text-xs font-semibold text-[#0296DF]">{a.days}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer total */}
              {activityRows.length > 0 && (
                <div className="flex justify-end border-t border-white/10 bg-[#ffffff05] px-4 py-2">
                  <span className="text-xs text-[#64748B]">
                    Total: <span className="font-semibold text-[#0296DF]">{totalDays} días</span>
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* ── Gastos ── */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-white">Registros de Gastos</h3>
              <span className="ml-auto text-xs text-[#64748B]">
                ${totalExpenses.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-white/10">
              {/* Table header */}
              <div className="grid grid-cols-[150px_170px_1fr_130px] gap-2 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
                {["Usuario","Período","Descripción","Monto"].map(h => (
                  <span key={h} className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div className="max-h-64 divide-y divide-white/5 overflow-y-auto">
                {expenseRows.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-[#475569]">
                    Sin gastos para el filtro seleccionado.
                  </div>
                ) : (
                  expenseRows.map((e, i) => (
                    <div
                      key={`exp-${e.id}-${i}`}
                      className="grid grid-cols-[150px_170px_1fr_130px] items-center gap-2 px-4 py-2.5 transition-colors hover:bg-white/[0.02]"
                    >
                      <span className="truncate text-xs text-[#CBD5E1]">{e.userName}</span>
                      <span className="truncate text-xs text-[#64748B]">{e.periodName}</span>
                      <span className="truncate text-xs text-[#94A3B8]">{e.description || "—"}</span>
                      <span className="text-xs font-semibold text-[#10B981]">
                        ${e.amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Footer total */}
              {expenseRows.length > 0 && (
                <div className="flex justify-end border-t border-white/10 bg-[#ffffff05] px-4 py-2">
                  <span className="text-xs text-[#64748B]">
                    Total:{" "}
                    <span className="font-semibold text-[#10B981]">
                      ${totalExpenses.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
