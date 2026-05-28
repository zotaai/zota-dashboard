"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/hooks/use-analytics";
import { useStore } from "@/lib/store";
import { exportAllReportsToExcel } from "@/lib/export-excel";
import { KPICards } from "./KPICards";
import { AreaPieChart } from "./AreaPieChart";
import { TimelineBarChart } from "./TimelineBarChart";
import { ExpenseTrendChart } from "./ExpenseTrendChart";

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-black/[0.04] p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1E293B]">
          {title}
        </h3>
        <p className="text-xs text-[#64748B]">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function AnalyticsTab() {
  const analytics = useAnalytics();
  const { state } = useStore();

  const handleExportAll = async () => {
    await exportAllReportsToExcel(
      state.reports,
      state.users,
      state.periods
    );
  };

  return (
    <div className="p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-wide text-[#1E293B]">
            ANALYTICS
          </h2>
          <p className="text-xs text-[#64748B]">
            Resumen consolidado de todos los reportes enviados
          </p>
        </div>
        {state.reports.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportAll}
            className="h-8 border border-black/[0.08] bg-black/[0.04] text-xs text-[#475569] hover:border-[#10B981]/40 hover:text-[#1E293B]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar todo (.xlsx)
          </Button>
        )}
      </div>

      <KPICards data={analytics} />

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Distribución por Cliente"
          subtitle="% de días dedicados por cliente en todos los reportes"
        >
          <AreaPieChart data={analytics.areaDistribution} />
        </ChartCard>

        <ChartCard
          title="Días por Período"
          subtitle="Total de días laborables registrados por quincena"
        >
          <TimelineBarChart data={analytics.periodTrend} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard
          title="Tendencia de Gastos"
          subtitle="Evolución del monto de gastos por período"
        >
          <ExpenseTrendChart data={analytics.expenseTrend} />
        </ChartCard>
      </div>
    </div>
  );
}
