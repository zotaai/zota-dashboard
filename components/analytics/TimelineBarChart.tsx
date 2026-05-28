"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PeriodDataPoint } from "@/hooks/use-analytics";

interface TimelineBarChartProps {
  data: PeriodDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1976D2] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-white">{label}</p>
      <p className="text-[#0296DF]">
        Días registrados:{" "}
        <span className="font-bold">{payload[0]?.value}</span>
      </p>
      <p className="text-white/70">
        Reportes:{" "}
        <span className="font-bold">{payload[0]?.payload?.reports}</span>
      </p>
    </div>
  );
};

export function TimelineBarChart({ data }: TimelineBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-center text-sm text-white/50">
        Sin reportes enviados. Envía reportes para ver la evolución por período.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barSize={32} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
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
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar dataKey="days" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={i === data.length - 1 ? "#0296DF" : "#0296DF60"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
