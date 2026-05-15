"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AreaDataPoint } from "@/hooks/use-analytics";

const COLORS = [
  "#0296DF",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
];

interface AreaPieChartProps {
  data: AreaDataPoint[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as AreaDataPoint;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0F172A] px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{d.area}</p>
      <p className="text-[#94A3B8]">
        {d.days} días — {d.percentage}%
      </p>
    </div>
  );
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}: any) => {
  if (percentage < 8) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight="bold"
    >
      {`${Math.round(percentage)}%`}
    </text>
  );
};

export function AreaPieChart({ data }: AreaPieChartProps) {
  if (data.length === 0) {
    return (
      <EmptyChart message="Sin datos de actividades. Envía reportes para ver la distribución." />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="days"
          nameKey="area"
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={50}
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-[#94A3B8]">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-center text-sm text-[#475569]">
      {message}
    </div>
  );
}
