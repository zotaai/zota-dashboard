"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";
import { formatCurrency } from "@/lib/calculations";
import type { PeriodDataPoint } from "@/hooks/use-analytics";

interface ExpenseTrendChartProps {
  data: PeriodDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a2d44] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-white">{label}</p>
      <p className="text-[#10B981]">
        Gastos:{" "}
        <span className="font-bold">
          {formatCurrency(payload[0]?.value ?? 0)}
        </span>
      </p>
    </div>
  );
};

export function ExpenseTrendChart({ data }: ExpenseTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-center text-sm text-[#475569]">
        Sin gastos registrados. Añade gastos en tus reportes para ver la tendencia.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.05)"
          vertical={false}
        />
        <XAxis
          dataKey="period"
          tick={{ fill: "#64748B", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#64748B", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="#10B981"
          strokeWidth={2.5}
          dot={<Dot fill="#10B981" r={4} stroke="#1a2d44" strokeWidth={2} />}
          activeDot={{ r: 6, fill: "#10B981", stroke: "#1a2d44", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
