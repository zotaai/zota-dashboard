"use client";

import { useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

export function AreaManager() {
  const { state, dispatch } = useStore();
  const [newArea, setNewArea] = useState("");

  const handleAdd = () => {
    const area = newArea.trim();
    if (!area || state.areas.includes(area)) return;
    dispatch({ type: "ADD_AREA", payload: area });
    setNewArea("");
  };

  const handleDelete = (area: string) => {
    if (state.areas.length <= 1) return;
    dispatch({ type: "DELETE_AREA", payload: area });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-white">
          GESTIÓN DE ÁREAS
        </h2>
        <p className="text-xs text-[#64748B]">
          Áreas disponibles para clasificar actividades
        </p>
      </div>

      {/* Add form */}
      <div className="mb-5 rounded-lg border border-white/10 bg-[#ffffff05] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Agregar Área
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]" />
            <Input
              placeholder="Nombre del área"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-[#475569] focus:border-[#0296DF] focus:bg-white/10"
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

      {/* Chips grid */}
      <div className="flex flex-wrap gap-2">
        {state.areas.map((area) => (
          <div
            key={area}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 pl-3 pr-1.5 py-1"
          >
            <span className="text-sm text-[#94A3B8]">{area}</span>
            <button
              onClick={() => handleDelete(area)}
              disabled={state.areas.length <= 1}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[#475569] transition-colors hover:bg-[#EF4444]/20 hover:text-[#EF4444] disabled:opacity-30"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
