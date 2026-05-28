"use client";

import { useState } from "react";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";

export function ProjectManager() {
  const { state, dispatch } = useStore();
  const [newProject,    setNewProject]    = useState("");
  const [selectedClient, setSelectedClient] = useState("");

  const handleAdd = () => {
    const name = newProject.trim();
    if (!name || !selectedClient) return;
    const exists = state.projects.some(
      (p) => p.name === name && p.clientName === selectedClient
    );
    if (exists) return;
    dispatch({ type: "ADD_PROJECT", payload: { name, clientName: selectedClient } });
    setNewProject("");
  };

  const handleDelete = (projectName: string, clientName: string) => {
    dispatch({ type: "DELETE_PROJECT", payload: { name: projectName, clientName } });
  };

  // Group projects by client for display
  const grouped = state.clients.map((client) => ({
    client,
    projects: state.projects.filter((p) => p.clientName === client),
  }));

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-[#1E293B]">
          GESTIÓN DE PROYECTOS
        </h2>
        <p className="text-xs text-[#64748B]">
          Proyectos asociados a cada cliente
        </p>
      </div>

      {/* Add form */}
      <div className="mb-5 rounded-lg border border-black/[0.08] bg-black/[0.03] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Agregar Proyecto
        </p>
        <div className="flex gap-3">
          {/* Client selector */}
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="h-9 w-44 shrink-0 border-black/[0.08] bg-black/[0.04] text-sm text-[#1E293B] focus:border-[#0296DF]">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent className="border-black/[0.08] bg-white">
              {state.clients.map((c) => (
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

          {/* Project name */}
          <div className="relative flex-1">
            <FolderKanban className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
            <Input
              placeholder="Nombre del proyecto"
              value={newProject}
              onChange={(e) => setNewProject(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              disabled={!selectedClient}
              className="h-9 border-black/[0.08] bg-black/[0.04] pl-9 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#0296DF] focus:bg-black/[0.06] disabled:opacity-40"
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={!newProject.trim() || !selectedClient}
            className="h-9 bg-[#0296DF] text-sm font-medium text-white hover:bg-[#0284c7] disabled:opacity-40"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      {/* Projects grouped by client */}
      <div className="space-y-4">
        {grouped.map(({ client, projects }) => (
          <div key={client}>
            {/* Client label */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#0296DF]">
                {client}
              </span>
              <div className="h-px flex-1 bg-black/[0.06]" />
              <span className="text-xs text-[#94A3B8]">
                {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}
              </span>
            </div>

            {projects.length === 0 ? (
              <p className="pl-1 text-xs text-[#94A3B8] italic">
                Sin proyectos asignados.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <div
                    key={`${p.clientName}-${p.name}`}
                    className="flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-black/[0.04] py-1 pl-3 pr-1.5"
                  >
                    <FolderKanban className="h-3 w-3 text-[#64748B]" />
                    <span className="text-sm text-[#475569]">{p.name}</span>
                    <button
                      onClick={() => handleDelete(p.name, p.clientName)}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#EF4444]/20 hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
