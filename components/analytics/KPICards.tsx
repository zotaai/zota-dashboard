"use client";

import { FileText, Clock, DollarSign, TrendingUp } from "lucide-react";
import { formatCurrency, formatDays } from "@/lib/calculations";
import type { AnalyticsData } from "@/hooks/use-analytics";

interface KPICardsProps {
  data: AnalyticsData;
}

interface KPICardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

function KPICard({ icon: Icon, label, value, sub, color }: KPICardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#ffffff06] p-5 backdrop-blur-sm transition-colors hover:bg-[#ffffff0a]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
          {label}
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#64748B]">{sub}</p>}
    </div>
  );
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <KPICard
        icon={FileText}
        label="Reportes Enviados"
        value={data.totalReports.toString()}
        sub="Total acumulado"
        color="#0296DF"
      />
      <KPICard
        icon={Clock}
        label="Días Registrados"
        value={formatDays(data.totalDays)}
        sub="Días laborables totales"
        color="#10B981"
      />
      <KPICard
        icon={DollarSign}
        label="Total Gastos"
        value={formatCurrency(data.totalExpenses)}
        sub="Gastos acumulados"
        color="#F59E0B"
      />
      <KPICard
        icon={TrendingUp}
        label="Días Promedio"
        value={formatDays(data.avgDaysPerReport)}
        sub="Por reporte"
        color="#8B5CF6"
      />
    </div>
  );
}
