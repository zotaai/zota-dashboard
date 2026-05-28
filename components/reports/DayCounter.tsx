"use client";

import { AlertCircle, Clock } from "lucide-react";
import { formatDays } from "@/lib/calculations";

interface DayCounterProps {
  targetDays: number;
  recordedDays: number;
  isValid: boolean;
  showPeriodBadge?: boolean;
}

export function DayCounter({
  targetDays,
  recordedDays,
  isValid,
  showPeriodBadge = true,
}: DayCounterProps) {
  const remaining = targetDays - recordedDays;

  return (
    <div className="space-y-2">
      {showPeriodBadge && targetDays > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-[#0296DF]/20 bg-[#0296DF]/5 px-4 py-2.5">
          <Clock className="h-4 w-4 text-[#0296DF]" />
          <span className="text-sm text-[#475569]">
            Días laborables objetivo:
          </span>
          <span className="rounded bg-[#0296DF]/20 px-2 py-0.5 text-sm font-semibold text-[#0296DF]">
            {targetDays} días
          </span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <span className="text-sm text-[#475569]">Días registrados:</span>
        <span
          className={`rounded px-2 py-0.5 text-sm font-semibold ${
            isValid
              ? "bg-[#10B981]/20 text-[#10B981]"
              : "bg-[#F59E0B]/20 text-[#F59E0B]"
          }`}
        >
          {formatDays(recordedDays)} / {targetDays}
        </span>
      </div>

      {!isValid && recordedDays > 0 && targetDays > 0 && (
        <div className="flex items-center justify-end gap-1.5 text-xs text-[#EF4444]">
          <AlertCircle className="h-3.5 w-3.5" />
          {remaining > 0
            ? `Faltan ${formatDays(remaining)} días por registrar.`
            : `Excedido en ${formatDays(Math.abs(remaining))} días.`}
        </div>
      )}
    </div>
  );
}
