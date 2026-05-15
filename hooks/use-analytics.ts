import { useMemo } from "react";
import { useStore } from "@/lib/store";
import type { Report } from "@/types";

export interface AreaDataPoint {
  area: string;  // kept as "area" for chart compatibility
  days: number;
  percentage: number;
}

export interface PeriodDataPoint {
  period: string;
  days: number;
  expenses: number;
  reports: number;
}

export interface AnalyticsData {
  totalReports: number;
  totalDays: number;
  totalExpenses: number;
  avgDaysPerReport: number;
  areaDistribution: AreaDataPoint[];
  periodTrend: PeriodDataPoint[];
  expenseTrend: PeriodDataPoint[];
}

export function useAnalytics(): AnalyticsData {
  const { state } = useStore();

  return useMemo(() => {
    const { reports, periods, clients, projects: _projects } = state;
    void _projects; // not used directly — analytics aggregates by client name from activities

    const totalReports = reports.length;
    const totalDays = reports.reduce((s, r) => s + r.totalDays, 0);
    const totalExpenses = reports.reduce((s, r) => s + r.totalExpenses, 0);
    const avgDaysPerReport = totalReports > 0 ? totalDays / totalReports : 0;

    // Distribution by CLIENT across all activities
    const clientDays: Record<string, number> = {};
    for (const c of clients) clientDays[c] = 0;
    for (const report of reports) {
      for (const act of report.activities) {
        if (act.client) {
          clientDays[act.client] = (clientDays[act.client] ?? 0) + act.days;
        }
      }
    }
    const areaDistribution: AreaDataPoint[] = Object.entries(clientDays)
      .filter(([, d]) => d > 0)
      .map(([client, days]) => ({
        area: client,  // chart uses "area" key internally
        days,
        percentage: totalDays > 0 ? Math.round((days / totalDays) * 100) : 0,
      }))
      .sort((a, b) => b.days - a.days);

    // Trend by period
    const periodMap: Record<
      string,
      { days: number; expenses: number; reports: number; name: string }
    > = {};
    for (const p of periods) {
      periodMap[p.id] = { days: 0, expenses: 0, reports: 0, name: p.name };
    }
    for (const r of reports) {
      if (periodMap[r.periodId]) {
        periodMap[r.periodId].days += r.totalDays;
        periodMap[r.periodId].expenses += r.totalExpenses;
        periodMap[r.periodId].reports += 1;
      }
    }

    const periodTrend: PeriodDataPoint[] = Object.values(periodMap)
      .filter((p) => p.reports > 0)
      .map((p) => ({
        period: p.name.split(" ").slice(0, 3).join(" "),
        days: p.days,
        expenses: p.expenses,
        reports: p.reports,
      }));

    return {
      totalReports,
      totalDays,
      totalExpenses,
      avgDaysPerReport,
      areaDistribution,
      periodTrend,
      expenseTrend: periodTrend,
    };
  }, [state]);
}

export function useReportsByUser(userId: string): Report[] {
  const { state } = useStore();
  return useMemo(
    () => state.reports.filter((r) => r.userId === userId),
    [state.reports, userId]
  );
}
