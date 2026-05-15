"use client";

import { useRef } from "react";
import { Plus, Trash2, Upload, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Expense } from "@/types";

interface ExpenseTableProps {
  expenses: Expense[];
  onAdd: () => void;
  onUpdate: (
    id: string,
    field: keyof Expense,
    value: string | number | null
  ) => void;
  onDelete: (id: string) => void;
}

export function ExpenseTable({
  expenses,
  onAdd,
  onUpdate,
  onDelete,
}: ExpenseTableProps) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileChange = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdate(id, "fileData", e.target?.result as string);
      onUpdate(id, "fileName", file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
            Registro de Gastos
          </h3>
          <p className="text-xs text-[#64748B]">
            Registre los gastos asociados al período
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

      <div className="overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[1fr_120px_160px_44px] gap-2 border-b border-white/10 bg-[#ffffff05] px-4 py-2.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Descripción del Gasto
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Monto ($)
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Factura
          </span>
          <span />
        </div>

        <div className="divide-y divide-white/5">
          {expenses.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#475569]">
              No hay gastos registrados. Haga clic en{" "}
              <span className="text-[#0296DF]">Añadir</span> para comenzar.
            </div>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className="grid grid-cols-[1fr_120px_160px_44px] items-center gap-2 px-4 py-2 transition-colors hover:bg-white/[0.02]"
              >
                <Input
                  placeholder="Descripción del gasto"
                  value={expense.description}
                  onChange={(e) =>
                    onUpdate(expense.id, "description", e.target.value)
                  }
                  className="h-8 border-transparent bg-white/5 text-sm text-white placeholder:text-[#475569] focus:border-[#0296DF] focus:bg-white/10"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={expense.amount || ""}
                  onChange={(e) =>
                    onUpdate(
                      expense.id,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  className="h-8 border-transparent bg-white/5 text-sm text-white focus:border-[#0296DF] focus:bg-white/10"
                />
                <div>
                  <input
                    ref={(el) => {
                      fileRefs.current[expense.id] = el;
                    }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(e) =>
                      handleFileChange(
                        expense.id,
                        e.target.files?.[0] ?? null
                      )
                    }
                  />
                  {expense.fileName ? (
                    <button
                      onClick={() => fileRefs.current[expense.id]?.click()}
                      className="flex h-8 w-full items-center gap-1.5 truncate rounded border border-[#0296DF]/30 bg-[#0296DF]/10 px-2 text-xs text-[#0296DF] hover:bg-[#0296DF]/20"
                    >
                      <Paperclip className="h-3 w-3 shrink-0" />
                      <span className="truncate">{expense.fileName}</span>
                    </button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileRefs.current[expense.id]?.click()}
                      className="h-8 w-full justify-start border border-transparent bg-white/5 text-xs text-[#64748B] hover:border-[#0296DF] hover:bg-white/10 hover:text-white"
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Subir archivo
                    </Button>
                  )}
                </div>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(expense.id)}
                    className="h-7 w-7 text-[#64748B] hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
