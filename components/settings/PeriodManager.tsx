"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar, Lock, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { calculateWorkingDays } from "@/lib/calculations";
import type { BillingPeriod } from "@/types";

export function PeriodManager() {
  const { state, dispatch } = useStore();
  const [newPeriod, setNewPeriod] = useState({ name: "", startDate: "", endDate: "" });
  // Track which period's working days field is being edited
  const [editingDays, setEditingDays] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) return;
    dispatch({
      type: "ADD_PERIOD",
      payload: { id: Date.now().toString(), ...newPeriod, workingDays: null },
    });
    setNewPeriod({ name: "", startDate: "", endDate: "" });
  };

  const handleUpdateDays = (period: BillingPeriod, value: string) => {
    const parsed = parseInt(value, 10);
    const workingDays = isNaN(parsed) || parsed < 0 ? null : parsed;
    dispatch({ type: "UPDATE_PERIOD", payload: { ...period, workingDays } });
  };

  const handleResetDays = (period: BillingPeriod) => {
    dispatch({ type: "UPDATE_PERIOD", payload: { ...period, workingDays: null } });
    setEditingDays(null);
  };

  const handleDelete = (id: string) => {
    dispatch({ type: "DELETE_PERIOD", payload: id });
  };

  const getWorkingDays = (period: BillingPeriod) =>
    period.workingDays != null
      ? period.workingDays
      : calculateWorkingDays(period.startDate, period.endDate);

  const isOverridden = (period: BillingPeriod) => period.workingDays != null;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-white">
          GESTIÓN DE PERÍODOS
        </h2>
        <p className="text-xs text-[#64748B]">
          Configure los períodos quincenales. Solo los días laborables son editables.
        </p>
      </div>

      {/* Add form */}
      <div className="mb-5 rounded-lg border border-white/10 bg-[#ffffff05] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Agregar Nuevo Período
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Nombre del período"
            value={newPeriod.name}
            onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
            className="h-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-[#475569] focus:border-[#0296DF] focus:bg-white/10"
          />
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]" />
            <Input
              type="date"
              value={newPeriod.startDate}
              onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]" />
            <Input
              type="date"
              value={newPeriod.endDate}
              onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate}
            className="h-9 bg-[#0296DF] text-sm font-medium text-white hover:bg-[#0284c7] disabled:opacity-40"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-white/10">

        {/* Header */}
        <div className="grid grid-cols-[1fr_130px_130px_130px_44px] gap-2 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#475569]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Nombre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#475569]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Inicio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-[#475569]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Fin</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Pencil className="h-3 w-3 text-[#0296DF]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#0296DF]">Días Lab.</span>
          </div>
          <span />
        </div>

        {/* Rows */}
        <div className="divide-y divide-white/5">
          {state.periods.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#475569]">
              No hay períodos registrados.
            </div>
          ) : (
            state.periods.map((period) => (
              <div
                key={period.id}
                className="grid grid-cols-[1fr_130px_130px_130px_44px] items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.02]"
              >
                {/* Nombre — solo lectura */}
                <div className="flex h-8 items-center rounded bg-white/[0.03] px-3">
                  <span className="truncate text-sm text-[#94A3B8]">{period.name}</span>
                </div>

                {/* Fecha inicio — solo lectura */}
                <div className="flex h-8 items-center rounded bg-white/[0.03] px-3">
                  <span className="text-sm text-[#94A3B8]">
                    {period.startDate
                      ? new Date(period.startDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>

                {/* Fecha fin — solo lectura */}
                <div className="flex h-8 items-center rounded bg-white/[0.03] px-3">
                  <span className="text-sm text-[#94A3B8]">
                    {period.endDate
                      ? new Date(period.endDate + "T00:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </span>
                </div>

                {/* Días laborables — EDITABLE */}
                <div className="flex items-center gap-1">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="31"
                      value={getWorkingDays(period)}
                      onFocus={() => setEditingDays(period.id)}
                      onBlur={() => setEditingDays(null)}
                      onChange={(e) => handleUpdateDays(period, e.target.value)}
                      className={`h-8 border text-center text-sm font-semibold transition-colors focus:bg-white/10
                        ${isOverridden(period)
                          ? "border-[#F59E0B]/50 bg-[#F59E0B]/10 text-[#F59E0B] focus:border-[#F59E0B]"
                          : "border-[#0296DF]/30 bg-[#0296DF]/10 text-[#0296DF] focus:border-[#0296DF]"
                        }
                        ${editingDays === period.id ? "ring-1 ring-[#0296DF]/40" : ""}
                      `}
                    />
                    {/* Badge: auto o editado */}
                    <span className={`absolute -top-2 right-1 rounded-full px-1 text-[9px] font-bold leading-4
                      ${isOverridden(period)
                        ? "bg-[#F59E0B] text-black"
                        : "bg-[#0296DF]/30 text-[#0296DF]"
                      }`}
                    >
                      {isOverridden(period) ? "custom" : "auto"}
                    </span>
                  </div>

                  {/* Reset a automático */}
                  {isOverridden(period) && (
                    <button
                      onClick={() => handleResetDays(period)}
                      title="Restaurar cálculo automático"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#475569] transition-colors hover:bg-white/10 hover:text-[#F59E0B]"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Eliminar */}
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

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-[#475569]">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#0296DF]/60" />
          <span><strong className="text-[#0296DF]">auto</strong> — calculado desde fechas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
          <span><strong className="text-[#F59E0B]">custom</strong> — ajustado manualmente (feriados)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RotateCcw className="h-3 w-3" />
          <span>restaura el cálculo automático</span>
        </div>
      </div>
    </div>
  );
}
