"use client";

import { FileText, BarChart3, Settings, WifiOff, RefreshCw, Loader2, Database, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ReportTab } from "@/components/reports/ReportTab";
import { AnalyticsTab } from "@/components/analytics/AnalyticsTab";
import { SettingsTab } from "@/components/settings/SettingsTab";
import { HistoryTab } from "@/components/history/HistoryTab";
import { useStore } from "@/lib/store";
import { isConfigured } from "@/lib/supabase";

const TAB_CLASS =
  "flex flex-1 items-center justify-center gap-2 rounded-none py-3 text-sm font-medium tracking-wide text-[#94A3B8] transition-colors data-[state=active]:bg-[#0296DF]/10 data-[state=active]:text-[#0296DF]";

function LoadingScreen() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-[#0296DF]" />
      <p className="text-sm text-[#64748B]">Iniciando aplicación…</p>
    </div>
  );
}

function StatusBar() {
  const { syncing, connected } = useStore();

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-3 py-1 text-xs text-[#F59E0B]">
        <WifiOff className="h-3 w-3" />
        Modo local — configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
      </div>
    );
  }

  if (syncing) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#0296DF]/20 bg-[#0296DF]/10 px-3 py-1 text-xs text-[#0296DF]">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Sincronizando con Supabase…
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#10B981]/20 bg-[#10B981]/10 px-3 py-1 text-xs text-[#10B981]">
        <Database className="h-3 w-3" />
        Supabase · Tiempo real activo
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#EF4444]/20 bg-[#EF4444]/10 px-3 py-1 text-xs text-[#EF4444]">
      <WifiOff className="h-3 w-3" />
      Sin conexión a Supabase — usando caché local
    </div>
  );
}

export function Dashboard() {
  const { loading } = useStore();

  return (
    <div className="min-h-screen bg-[#0C112E] px-4 py-6 md:px-8 md:py-8">
      <DashboardHeader />

      <div className="mx-auto mb-3 max-w-6xl">
        <StatusBar />
      </div>

      <div className="mx-auto max-w-6xl rounded-xl border border-white/10 bg-[#ffffff08] shadow-2xl backdrop-blur-md">
        {loading ? (
          <LoadingScreen />
        ) : (
          <Tabs defaultValue="reports" className="w-full">
            <TabsList className="flex w-full rounded-none rounded-t-xl border-b border-white/10 bg-transparent p-0">
              <TabsTrigger value="reports"   className={`${TAB_CLASS} rounded-tl-xl border-r border-white/10`}>
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">MIS REPORTES</span>
              </TabsTrigger>
              <TabsTrigger value="history"   className={`${TAB_CLASS} border-r border-white/10`}>
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">REPORTES</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className={`${TAB_CLASS} border-r border-white/10`}>
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">ANALYTICS</span>
              </TabsTrigger>
              <TabsTrigger value="settings"  className={`${TAB_CLASS} rounded-tr-xl`}>
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">CONFIGURACIÓN</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports"   className="mt-0"><ReportTab /></TabsContent>
            <TabsContent value="history"   className="mt-0"><HistoryTab /></TabsContent>
            <TabsContent value="analytics" className="mt-0"><AnalyticsTab /></TabsContent>
            <TabsContent value="settings"  className="mt-0"><SettingsTab /></TabsContent>
          </Tabs>
        )}
      </div>

      <footer className="mx-auto mt-6 max-w-6xl text-center">
        <p className="text-xs tracking-wide text-[#475569]">
          © 2026 Zota AI Consulting. Elite AI B2B Solutions.
        </p>
      </footer>
    </div>
  );
}
