"use client";

import { useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";

export function UserManager() {
  const { state, dispatch } = useStore();
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    dispatch({
      type: "ADD_USER",
      payload: { id: Date.now().toString(), name },
    });
    setNewName("");
  };

  const handleUpdate = (id: string, name: string) => {
    const user = state.users.find((u) => u.id === id);
    if (!user) return;
    dispatch({ type: "UPDATE_USER", payload: { ...user, name } });
  };

  const handleDelete = (id: string) => {
    if (state.users.length <= 1) return;
    dispatch({ type: "DELETE_USER", payload: id });
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-wide text-white">
          GESTIÓN DE USUARIOS
        </h2>
        <p className="text-xs text-[#64748B]">
          Consultores que pueden enviar reportes
        </p>
      </div>

      {/* Add form */}
      <div className="mb-5 rounded-lg border border-white/10 bg-[#ffffff05] p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#64748B]">
          Agregar Consultor
        </p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#475569]" />
            <Input
              placeholder="Nombre completo"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
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

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1fr_50px] gap-2 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Nombre del Consultor
          </span>
          <span />
        </div>
        <div className="divide-y divide-white/5">
          {state.users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_50px] items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.02]"
            >
              <Input
                value={user.name}
                onChange={(e) => handleUpdate(user.id, e.target.value)}
                className="h-8 border-transparent bg-white/5 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
              />
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(user.id)}
                  disabled={state.users.length <= 1}
                  className="h-7 w-7 text-[#64748B] hover:bg-[#EF4444]/10 hover:text-[#EF4444] disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
