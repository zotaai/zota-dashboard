"use client";

import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { PeriodManager } from "./PeriodManager";
import { UserManager } from "./UserManager";
import { ClientManager } from "./ClientManager";
import { ProjectManager } from "./ProjectManager";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

const SYNC_URL =
  "https://xlefqqlabeidndqsrvca.supabase.co/functions/v1/sync-from-notion";

type SyncState = "idle" | "loading" | "success" | "error";

function NotionSyncSection() {
  const { refresh } = useStore();
  const [state, setState] = useState<SyncState>("idle");
  const [detail, setDetail] = useState<string>("");

  const handleSync = async () => {
    setState("loading");
    setDetail("");
    try {
      const res = await fetch(SYNC_URL, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        // The sync writes straight to Postgres, so the local store is stale until
        // we re-read it. Realtime alone is not enough to rely on here.
        await refresh();
        setState("success");
        const removed = (json.deleted_clients ?? 0) + (json.deleted_projects ?? 0);
        setDetail(
          `${json.clients} clientes · ${json.projects} proyectos sincronizados` +
            (removed > 0
              ? ` · ${json.deleted_clients} clientes y ${json.deleted_projects} proyectos eliminados`
              : "")
        );
      } else {
        setState("error");
        setDetail(json.error ?? "Error desconocido");
      }
    } catch (err) {
      setState("error");
      setDetail(err instanceof Error ? err.message : "Error de red");
    }
  };

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1E293B]">
          Sincronización con Notion
        </h3>
        <p className="text-xs text-[#64748B]">
          Notion es la fuente única: se importan sus clientes y proyectos y se
          eliminan los que ya no existan allá. También se actualiza
          automáticamente cada hora.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={handleSync}
          disabled={state === "loading"}
          className="h-8 bg-[#0296DF] text-xs font-medium text-white hover:bg-[#0284c7] disabled:opacity-60"
        >
          <RefreshCw
            className={`mr-1.5 h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`}
          />
          {state === "loading" ? "Sincronizando…" : "Sincronizar con Notion"}
        </Button>

        {state === "success" && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {detail}
          </span>
        )}
        {state === "error" && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}

export function SettingsTab() {
  return (
    <div className="space-y-8 p-5">
      <PeriodManager />
      <Separator className="bg-black/[0.06]" />
      <UserManager />
      <Separator className="bg-black/[0.06]" />
      <NotionSyncSection />
      <Separator className="bg-black/[0.06]" />
      <ClientManager />
      <Separator className="bg-black/[0.06]" />
      <ProjectManager />
    </div>
  );
}
