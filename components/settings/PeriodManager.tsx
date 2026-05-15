"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { calculateWorkingDays } from "@/lib/calculations";
import type { BillingPeriod } from "@/types";

export function PeriodManager() {
  const { state, dispatch } = useStore();
  const [newPeriod, setNewPeriod] = useState({ name: "", startDate: "", endDate: "" });

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

  const handleDelete = (id: string) => {
    dispatch({ type: "DELETE_PERIOD", payload: id });
  };

  const getWorkingDays = (period: BillingPeriod) =>
    period.workingDays != null
      ? period.workingDays
      : calculateWorkingDays(period.startDate, period.endDate);

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
                <div className="flex justify-center">
                  <Input
                    type="number"
                    min="0"
                    max="31"
                    value={getWorkingDays(period)}
                    onChange={(e) => handleUpdateDays(period, e.target.value)}
                    className="h-8 w-20 border-[#0296DF]/30 bg-[#0296DF]/10 text-center text-sm font-semibold text-[#0296DF] focus:border-[#0296DF] focus:bg-white/10"
                  />
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

    </div>
  );
}
