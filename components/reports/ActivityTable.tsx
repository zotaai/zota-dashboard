"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Activity, Project } from "@/types";

// Single source of truth for the column layout
const COLS = "grid-cols-[1.5fr_1fr_1.5fr_72px_36px]";

interface ActivityTableProps {
  activities: Activity[];
  clients: string[];
  projects: Project[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Activity, value: string | number) => void;
  onDelete: (id: string) => void;
}

export function ActivityTable({
  activities,
  clients,
  projects,
  onAdd,
  onUpdate,
  onDelete,
}: ActivityTableProps) {
  const projectsForClient = (clientName: string) =>
    projects.filter((p) => p.clientName === clientName);

  const handleClientChange = (activityId: string, newClient: string) => {
    onUpdate(activityId, "client", newClient);
    const activity = activities.find((a) => a.id === activityId);
    if (activity) {
      const stillValid = projects.some(
        (p) => p.clientName === newClient && p.name === activity.project
      );
      if (!stillValid) onUpdate(activityId, "project", "");
    }
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-[#1E293B]">
            Registro de Dedicaciones
          </h3>
          <p className="text-xs text-[#64748B]">
            Registre las actividades realizadas durante el período
          </p>
        </div>
        <Button
          onClick={onAdd}
          size="sm"
          className="h-8 bg-[#0296DF] text-xs font-medium text-white hover:bg-[#0284c7]"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Añadir
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-black/[0.08]">
        {/* ── Header ── same COLS as rows */}
        <div className={`grid ${COLS} gap-2 border-b border-black/[0.08] bg-black/[0.03] px-4 py-2.5`}>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Descripción de la Actividad
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Cliente
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Proyecto
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Días
          </span>
          <span />
        </div>

        {/* ── Rows ── */}
        <div className="divide-y divide-black/[0.06]">
          {activities.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
              No hay actividades registradas. Haga clic en{" "}
              <span className="text-[#0296DF]">Añadir</span> para comenzar.
            </div>
          ) : (
            activities.map((activity) => {
              const availableProjects = projectsForClient(activity.client);
              return (
                <div
                  key={activity.id}
                  className={`grid ${COLS} items-center gap-2 px-4 py-2 transition-colors hover:bg-black/[0.03]`}
                >
                  {/* Descripción */}
                  <Input
                    placeholder="Descripción de la actividad"
                    value={activity.description}
                    onChange={(e) => onUpdate(activity.id, "description", e.target.value)}
                    className="h-8 border-transparent bg-black/[0.04] text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0296DF] focus:bg-black/[0.06]"
                  />

                  {/* Cliente — wrapped in min-w-0 so it can't overflow the cell */}
                  <div className="min-w-0">
                    <Select
                      value={activity.client}
                      onValueChange={(v) => handleClientChange(activity.id, v)}
                    >
                      <SelectTrigger className="h-8 w-full overflow-hidden border-transparent bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF] [&>span]:truncate [&>span]:block">
                        <SelectValue placeholder="Cliente" />
                      </SelectTrigger>
                      <SelectContent className="border-black/[0.08] bg-white">
                        {clients.map((c) => (
                          <SelectItem
                            key={c}
                            value={c}
                            className="text-sm text-[#1E293B] focus:bg-[#0296DF]/20 focus:text-[#1E293B]"
                          >
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Proyecto — filtrado por cliente */}
                  <div className="min-w-0">
                    <Select
                      value={activity.project}
                      onValueChange={(v) => onUpdate(activity.id, "project", v)}
                      disabled={!activity.client || availableProjects.length === 0}
                    >
                      <SelectTrigger className="h-8 w-full overflow-hidden border-transparent bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF] disabled:opacity-40 [&>span]:truncate [&>span]:block">
                        <SelectValue
                          placeholder={
                            !activity.client
                              ? "Seleccione cliente"
                              : availableProjects.length === 0
                              ? "Sin proyectos"
                              : "Proyecto"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="border-black/[0.08] bg-white">
                        {availableProjects.map((p) => (
                          <SelectItem
                            key={p.name}
                            value={p.name}
                            className="text-sm text-[#1E293B] focus:bg-[#0296DF]/20 focus:text-[#1E293B]"
                          >
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Días */}
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    value={activity.days || ""}
                    onChange={(e) =>
                      onUpdate(activity.id, "days", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 border-transparent bg-black/[0.04] text-center text-sm text-[#1E293B] focus:border-[#0296DF] focus:bg-black/[0.06]"
                  />

                  {/* Eliminar */}
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(activity.id)}
                      className="h-7 w-7 text-[#64748B] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
