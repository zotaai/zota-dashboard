"use client";

import { useState } from "react";
import { Plus, Trash2, Calendar } from "lucide-react";
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
      payload: { id: Date.now().toString(), ...newPeriod },
    });
    setNewPeriod({ name: "", startDate: "", endDate: "" });
  };

  const handleUpdate = (id: string, field: keyof BillingPeriod, value: string) => {
    const period = state.periods.find((p) => p.id === id);
    if (!period) return;
    dispatch({ type: "UPDATE_PERIOD", payload: { ...period, [field]: value } });
  };

  const handleDelete = (id: string) => {
    dispatch({ type: "DELETE_PERIOD", payload: id });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-white">
          GESTIÓN DE PERÍODOS
        </h2>
        <p className="text-xs text-[#64748B]">
          Configure los períodos quincenales para el registro de tiempo
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
            className="h-9 bg-[#0296DF] text-sm font-medium text-white hover:bg-[#0284c7]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1fr_140px_140px_100px_50px] gap-2 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Nombre del Período</span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Fecha Inicio</span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Fecha Fin</span>
          <span className="text-center text-xs font-medium uppercase tracking-wider text-[#64748B]">Días Lab.</span>
          <span />
        </div>
        <div className="divide-y divide-white/5">
          {state.periods.map((period) => (
            <div
              key={period.id}
              className="grid grid-cols-[1fr_140px_140px_100px_50px] items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.02]"
            >
              <Input
                value={period.name}
                onChange={(e) => handleUpdate(period.id, "name", e.target.value)}
                className="h-8 border-transparent bg-white/5 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
              />
              <Input
                type="date"
                value={period.startDate}
                onChange={(e) => handleUpdate(period.id, "startDate", e.target.value)}
                className="h-8 border-transparent bg-white/5 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
              />
              <Input
                type="date"
                value={period.endDate}
                onChange={(e) => handleUpdate(period.id, "endDate", e.target.value)}
                className="h-8 border-transparent bg-white/5 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
              />
              <div className="flex justify-center">
                <span className="inline-flex h-7 min-w-[36px] items-center justify-center rounded bg-[#0296DF]/20 px-2.5 text-sm font-semibold text-[#0296DF]">
                  {calculateWorkingDays(period.startDate, period.endDate)}
                </span>
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
          ))}
        </div>
      </div>
    </div>
  );
}
