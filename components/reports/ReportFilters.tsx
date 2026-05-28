"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, BillingPeriod } from "@/types";

interface ReportFiltersProps {
  users: User[];
  periods: BillingPeriod[];
  selectedUser: string;
  selectedPeriod: string;
  onUserChange: (id: string) => void;
  onPeriodChange: (id: string) => void;
  periodDisabled?: boolean;
}

export function ReportFilters({
  users,
  periods,
  selectedUser,
  selectedPeriod,
  onUserChange,
  onPeriodChange,
  periodDisabled = false,
}: ReportFiltersProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-4">
      {/* Step 1 — Usuario */}
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Usuario
        </label>
        <Select value={selectedUser} onValueChange={onUserChange}>
          <SelectTrigger className="h-9 w-full border-black/[0.08] bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF]">
            <SelectValue placeholder="Seleccione usuario" />
          </SelectTrigger>
          <SelectContent className="border-black/[0.08] bg-white">
            {users.map((u) => (
              <SelectItem
                key={u.id}
                value={u.id}
                className="text-sm text-[#1E293B] focus:bg-[#0296DF]/20 focus:text-[#1E293B]"
              >
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Step 2 — Período (locked until user selected) */}
      <div className={periodDisabled ? "opacity-40" : ""}>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Período
        </label>
        <Select
          value={selectedPeriod}
          onValueChange={onPeriodChange}
          disabled={periodDisabled}
        >
          <SelectTrigger className="h-9 w-full border-black/[0.08] bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF] disabled:cursor-not-allowed">
            <SelectValue placeholder="Seleccione período" />
          </SelectTrigger>
          <SelectContent className="border-black/[0.08] bg-white">
            {periods.map((p) => (
              <SelectItem
                key={p.id}
                value={p.id}
                className="text-sm text-[#1E293B] focus:bg-[#0296DF]/20 focus:text-[#1E293B]"
              >
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
