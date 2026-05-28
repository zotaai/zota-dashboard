"use client";

import { useState } from "react";
import { Trash2, Lock, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { calculateWorkingDays } from "@/lib/calculations";
import type { BillingPeriod } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1, THIS_YEAR + 2];

function pad(n: number) { return n.toString().padStart(2, "0"); }

function lastDay(year: number, month: number) {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuincenaPreview {
  id:          string;
  name:        string;
  startDate:   string;
  endDate:     string;
  workingDays: number;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function PeriodManager() {
  const { state, dispatch } = useStore();

  const [year,    setYear]    = useState<string>(THIS_YEAR.toString());
  const [month,   setMonth]   = useState<string>("");
  const [preview, setPreview] = useState<QuincenaPreview[]>([]);
  const [saving,  setSaving]  = useState(false);

  // ── Generate preview ───────────────────────────────────────────────────────
  function buildPreview(y: string, m: string): QuincenaPreview[] {
    if (!y || !m) return [];
    const yn = parseInt(y);
    const mn = parseInt(m); // 1-based

    const last = lastDay(yn, mn);
    const mm   = pad(mn);

    return [
      {
        id:          `${yn}${mm}1`,
        name:        `1ra Quincena ${MONTHS[mn - 1]} ${yn}`,
        startDate:   `${yn}-${mm}-01`,
        endDate:     `${yn}-${mm}-15`,
        workingDays: calculateWorkingDays(`${yn}-${mm}-01`, `${yn}-${mm}-15`),
      },
      {
        id:          `${yn}${mm}2`,
        name:        `2da Quincena ${MONTHS[mn - 1]} ${yn}`,
        startDate:   `${yn}-${mm}-16`,
        endDate:     `${yn}-${mm}-${last}`,
        workingDays: calculateWorkingDays(`${yn}-${mm}-16`, `${yn}-${mm}-${last}`),
      },
    ];
  }

  const handleYearChange = (v: string) => {
    setYear(v);
    setPreview(buildPreview(v, month));
  };

  const handleMonthChange = (v: string) => {
    setMonth(v);
    setPreview(buildPreview(year, v));
  };

  const updatePreviewDays = (id: string, value: string) => {
    const n = parseInt(value, 10);
    setPreview(prev =>
      prev.map(p => p.id === id ? { ...p, workingDays: isNaN(n) || n < 0 ? 0 : n } : p)
    );
  };

  // ── Save preview ───────────────────────────────────────────────────────────
  const existsInState = (id: string) => state.periods.some(p => p.id === id);

  const handleSave = async () => {
    if (saving || preview.length === 0) return;
    setSaving(true);
    for (const q of preview) {
      if (!existsInState(q.id)) {
        await dispatch({
          type: "ADD_PERIOD",
          payload: {
            id:          q.id,
            name:        q.name,
            startDate:   q.startDate,
            endDate:     q.endDate,
            workingDays: q.workingDays,
          },
        });
      }
    }
    setSaving(false);
    setMonth("");
    setPreview([]);
  };

  const allExist = preview.length > 0 && preview.every(q => existsInState(q.id));

  // ── Existing periods ───────────────────────────────────────────────────────
  const handleDelete = (id: string) =>
    dispatch({ type: "DELETE_PERIOD", payload: id });

  const handleUpdateDays = (period: BillingPeriod, value: string) => {
    const n = parseInt(value, 10);
    dispatch({
      type: "UPDATE_PERIOD",
      payload: { ...period, workingDays: isNaN(n) || n < 0 ? null : n },
    });
  };

  const getWorkingDays = (p: BillingPeriod) =>
    p.workingDays != null ? p.workingDays : calculateWorkingDays(p.startDate, p.endDate);

  const fmtDate = (s: string) =>
    s ? new Date(s + "T00:00:00").toLocaleDateString("es-MX", {
      day: "2-digit", month: "short", year: "numeric",
    }) : "—";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Section title */}
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-[#1E293B]">
          GESTIÓN DE PERÍODOS
        </h2>
        <p className="text-xs text-[#64748B]">
          Selecciona el año y el mes — las dos quincenas se generan automáticamente.
          Ajusta los días laborables si hay feriados y luego guarda.
        </p>
      </div>

      {/* ── Generator ── */}
      <div className="mb-5 rounded-lg border border-black/[0.08] bg-black/[0.03] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Agregar Período
        </p>

        {/* Selectors */}
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={year} onValueChange={handleYearChange}>
            <SelectTrigger className="h-9 w-28 border-black/[0.08] bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-9 w-48 border-black/[0.08] bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF]">
              <SelectValue placeholder="Selecciona un mes…" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <>
            <div className="mb-3 overflow-hidden rounded-lg border border-black/[0.08]">
              {/* Preview header */}
              <div className="grid grid-cols-[1fr_110px_110px_90px] gap-2 border-b border-black/[0.08] bg-black/[0.05] px-4 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Período</span>
                <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Inicio</span>
                <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Fin</span>
                <div className="flex items-center gap-1">
                  <Pencil className="h-3 w-3 text-[#0296DF]" />
                  <span className="text-xs font-medium uppercase tracking-wider text-[#0296DF]">Días Lab.</span>
                </div>
              </div>

              {/* Preview rows */}
              <div className="divide-y divide-black/[0.06]">
                {preview.map(q => {
                  const exists = existsInState(q.id);
                  return (
                    <div
                      key={q.id}
                      className={`grid grid-cols-[1fr_110px_110px_90px] items-center gap-2 px-4 py-2.5 ${exists ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-[#1E293B]">{q.name}</span>
                        {exists && (
                          <span className="rounded text-xs text-[#F59E0B]">ya existe</span>
                        )}
                      </div>
                      <span className="text-sm text-[#475569]">
                        {new Date(q.startDate + "T00:00:00").toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short",
                        })}
                      </span>
                      <span className="text-sm text-[#475569]">
                        {new Date(q.endDate + "T00:00:00").toLocaleDateString("es-MX", {
                          day: "2-digit", month: "short",
                        })}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        max="31"
                        value={q.workingDays}
                        onChange={e => updatePreviewDays(q.id, e.target.value)}
                        disabled={exists}
                        className="h-8 w-20 border-[#0296DF]/30 bg-[#0296DF]/10 text-center text-sm font-semibold text-[#0296DF] focus:border-[#0296DF] focus:bg-black/[0.06] disabled:opacity-40"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || allExist}
              className="h-9 bg-[#0296DF] text-sm font-medium text-white hover:bg-[#0284c7] disabled:opacity-40"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saving ? "Guardando…" : allExist ? "Ya guardados" : "Guardar Quincenas"}
            </Button>
          </>
        )}
      </div>

      {/* ── Existing periods table ── */}
      <div className="overflow-hidden rounded-lg border border-black/[0.08]">
        {/* Header */}
        <div className="grid grid-cols-[1fr_130px_130px_130px_44px] gap-2 border-b border-black/[0.08] bg-black/[0.03] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#94A3B8]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Nombre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#94A3B8]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Inicio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#94A3B8]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Fin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pencil className="h-3 w-3 text-[#0296DF]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#0296DF]">Días Lab.</span>
          </div>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-black/[0.06]">
          {state.periods.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
              No hay períodos registrados.
            </div>
          ) : (
            state.periods.map(period => (
              <div
                key={period.id}
                className="grid grid-cols-[1fr_130px_130px_130px_44px] items-center gap-2 px-4 py-2 transition-colors hover:bg-black/[0.03]"
              >
                <div className="flex h-8 items-center rounded bg-black/[0.04] px-3">
                  <span className="truncate text-sm text-[#475569]">{period.name}</span>
                </div>
                <div className="flex h-8 items-center rounded bg-black/[0.04] px-3">
                  <span className="text-sm text-[#475569]">{fmtDate(period.startDate)}</span>
                </div>
                <div className="flex h-8 items-center rounded bg-black/[0.04] px-3">
                  <span className="text-sm text-[#475569]">{fmtDate(period.endDate)}</span>
                </div>
                <div className="flex justify-center">
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={getWorkingDays(period)}
                    onChange={e => handleUpdateDays(period, e.target.value)}
                    className="h-8 w-20 border-[#0296DF]/30 bg-[#0296DF]/10 text-center text-sm font-semibold text-[#0296DF] focus:border-[#0296DF] focus:bg-black/[0.06]"
                  />
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(period.id)}
                    className="h-7 w-7 text-[#64748B] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
