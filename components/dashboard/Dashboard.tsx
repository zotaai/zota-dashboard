"use client";

import {
  FileText,
  BarChart3,
  History,
  Settings,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ReportTab } from "@/components/reports/ReportTab";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { ReportHistory } from "@/components/history/ReportHistory";
import { SettingsTab } from "@/components/settings/SettingsTab";

const TAB_CLASS =
  "flex flex-1 items-center justify-center gap-2 rounded-none py-3 text-sm font-medium tracking-wide text-[#94A3B8] transition-colors data-[state=active]:bg-[#0296DF]/10 data-[state=active]:text-[#0296DF]";

export function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0C112E] px-4 py-6 md:px-8 md:py-8">
      <DashboardHeader />

      <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-[#ffffff08] shadow-2xl backdrop-blur-md">
        <Tabs defaultValue="reports" className="w-full">
          <TabsList className="flex w-full rounded-none rounded-t-xl border-b border-white/10 bg-transparent p-0">
            <TabsTrigger
              value="reports"
              className={`${TAB_CLASS} rounded-tl-xl border-r border-white/10`}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">MIS REPORTES</span>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className={`${TAB_CLASS} border-r border-white/10`}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">ANALYTICS</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className={`${TAB_CLASS} border-r border-white/10`}
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">HISTORIAL</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className={`${TAB_CLASS} rounded-tr-xl`}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">CONFIGURACIÓN</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="mt-0">
            <ReportTab />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <ReportHistory />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>

      <footer className="mx-auto mt-6 max-w-6xl text-center">
        <p className="text-xs tracking-wide text-[#475569]">
          © 2026 Zota AI Consulting. Elite AI B2B Solutions.
        </p>
      </footer>
    </div>
  );
}
