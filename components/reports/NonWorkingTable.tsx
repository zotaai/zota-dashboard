"use client";

import { Plus, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Activity } from "@/types";
import { NON_WORKING_TYPES } from "@/lib/non-working";

// Single source of truth for the column layout
const COLS = "grid-cols-[1.5fr_1.5fr_72px_36px]";

interface NonWorkingTableProps {
  entries:  Activity[];
  userName: string;
  onAdd:    () => void;
  onUpdate: (id: string, field: keyof Activity, value: string | number) => void;
  onDelete: (id: string) => void;
}

export function NonWorkingTable({
  entries,
  userName,
  onAdd,
  onUpdate,
  onDelete,
}: NonWorkingTableProps) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1E293B]">
            Días No Laborados
          </h3>
          <p className="text-xs text-[#64748B]">
            Licencias y vacaciones del período — cuentan para completar los días
            del mes
          </p>
        </div>
        <Button
          onClick={onAdd}
          size="sm"
          className="h-8 bg-[#0296DF] text-xs font-medium text-white hover:bg-[#0284c7]"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Añadir
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/[0.08]">
        {/* ── Header ── same COLS as rows */}
        <div className={`grid ${COLS} gap-2 border-b border-black/[0.08] bg-black/[0.03] px-4 py-2.5`}>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Trabajador
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Tipo de Día No Laborado
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Días
          </span>
          <span />
        </div>

        {/* ── Rows ── */}
        <div className="divide-y divide-black/[0.06]">
          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
              No hay días no laborados registrados. Haga clic en{" "}
              <span className="text-[#0296DF]">Añadir</span> si tuvo licencia o
              vacaciones.
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={`grid ${COLS} items-center gap-2 px-4 py-2 transition-colors hover:bg-black/[0.03]`}
              >
                {/* Trabajador — always the report's own user, so it is shown
                    rather than chosen: nobody files someone else's leave. */}
                <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-md bg-black/[0.03] px-3">
                  <Lock className="h-3 w-3 shrink-0 text-[#94A3B8]" />
                  <span className="truncate text-sm text-[#475569]">{userName}</span>
                </div>

                {/* Tipo */}
                <div className="min-w-0">
                  <Select
                    value={entry.description}
                    onValueChange={(v) => onUpdate(entry.id, "description", v)}
                  >
                    <SelectTrigger className="h-8 w-full overflow-hidden border-transparent bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF] [&>span]:truncate [&>span]:block">
                      <SelectValue placeholder="Seleccione tipo" />
                    </SelectTrigger>
                    <SelectContent className="border-black/[0.08] bg-white">
                      {NON_WORKING_TYPES.map((t) => (
                        <SelectItem
                          key={t}
                          value={t}
                          className="text-sm text-[#1E293B] focus:bg-[#0296DF]/20 focus:text-[#1E293B]"
                        >
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Días */}
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={entry.days || ""}
                  onChange={(e) =>
                    onUpdate(entry.id, "days", parseFloat(e.target.value) || 0)
                  }
                  className="h-8 border-transparent bg-black/[0.04] text-center text-sm text-[#1E293B] focus:border-[#0296DF] focus:bg-black/[0.06]"
                />

                {/* Eliminar */}
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(entry.id)}
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
