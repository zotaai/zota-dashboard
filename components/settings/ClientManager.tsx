"use client";

import { useState } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

export function ClientManager() {
  const { state, dispatch } = useStore();
  const [newClient, setNewClient] = useState("");

  const handleAdd = () => {
    const client = newClient.trim();
    if (!client || state.clients.includes(client)) return;
    dispatch({ type: "ADD_CLIENT", payload: client });
    setNewClient("");
  };

  const handleDelete = (client: string) => {
    if (state.clients.length <= 1) return;
    dispatch({ type: "DELETE_CLIENT", payload: client });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-white">
          GESTIÓN DE CLIENTES
        </h2>
        <p className="text-xs text-white/60">
          Clientes disponibles para clasificar actividades
        </p>
      </div>

      <div className="mb-5 rounded-lg border border-white/10 bg-[#ffffff05] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
          Agregar Cliente
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Building2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50" />
            <Input
              placeholder="Nombre del cliente"
              value={newClient}
              onChange={(e) => setNewClient(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/50 focus:border-[#0296DF] focus:bg-white/10"
            />
          </div>
          <Button
            onClick={handleAdd}
            className="h-9 bg-[#0296DF] text-sm font-medium text-white hover:bg-[#0284c7]"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {state.clients.map((client) => (
          <div
            key={client}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5"
          >
            <span className="text-sm text-white/70">{client}</span>
            <button
              onClick={() => handleDelete(client)}
              disabled={state.clients.length <= 1}
              className="flex h-5 w-5 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-[#EF4444]/20 hover:text-[#EF4444] disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
