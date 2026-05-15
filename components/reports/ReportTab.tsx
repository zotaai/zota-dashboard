"use client";

import { useState, useMemo } from "react";
import { Send, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { calculateWorkingDays } from "@/lib/calculations";
import { exportReportToPDF } from "@/lib/export-pdf";
import { exportReportToExcel } from "@/lib/export-excel";
import { ReportFilters } from "./ReportFilters";
import { ActivityTable } from "./ActivityTable";
import { ExpenseTable } from "./ExpenseTable";
import { DayCounter } from "./DayCounter";
import type { Activity, Expense, Report } from "@/types";

export function ReportTab() {
  const { state, dispatch } = useStore();

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const targetDays = useMemo(() => {
    const p = state.periods.find((x) => x.id === selectedPeriod);
    return p ? calculateWorkingDays(p.startDate, p.endDate) : 0;
  }, [state.periods, selectedPeriod]);

  const totalRecordedDays = useMemo(
    () => activities.reduce((s, a) => s + a.days, 0),
    [activities]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const isValid =
    totalRecordedDays === targetDays &&
    targetDays > 0 &&
    !!selectedUser &&
    !!selectedPeriod;

  // ── Activity handlers ──────────────────────────────────────────────────────
  const addActivity = () =>
    setActivities((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", area: "", days: 0 },
    ]);

  const updateActivity = (
    id: string,
    field: keyof Activity,
    value: string | number
  ) =>
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );

  const deleteActivity = (id: string) =>
    setActivities((prev) => prev.filter((a) => a.id !== id));

  // ── Expense handlers ───────────────────────────────────────────────────────
  const addExpense = () =>
    setExpenses((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        description: "",
        amount: 0,
        fileName: null,
        fileData: null,
      },
    ]);

  const updateExpense = (
    id: string,
    field: keyof Expense,
    value: string | number | null
  ) =>
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

  const deleteExpense = (id: string) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!isValid || submitting) return;
    setSubmitting(true);

    const report: Report = {
      id: Date.now().toString(),
      userId: selectedUser,
      periodId: selectedPeriod,
      submittedAt: new Date().toISOString(),
      activities,
      expenses,
      totalDays: totalRecordedDays,
      totalExpenses,
    };

    dispatch({ type: "SUBMIT_REPORT", payload: report });

    // Reset form
    setActivities([]);
    setExpenses([]);
    setSelectedUser("");
    setSelectedPeriod("");
    setSubmitting(false);
  };

  // ── Export current draft ───────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!selectedUser || !selectedPeriod) return;
    const user = state.users.find((u) => u.id === selectedUser);
    const period = state.periods.find((p) => p.id === selectedPeriod);
    if (!user || !period) return;

    const draftReport: Report = {
      id: "draft",
      userId: selectedUser,
      periodId: selectedPeriod,
      submittedAt: new Date().toISOString(),
      activities,
      expenses,
      totalDays: totalRecordedDays,
      totalExpenses,
    };
    await exportReportToPDF(draftReport, user, period);
  };

  const handleExportExcel = async () => {
    if (!selectedUser || !selectedPeriod) return;
    const user = state.users.find((u) => u.id === selectedUser);
    const period = state.periods.find((p) => p.id === selectedPeriod);
    if (!user || !period) return;

    const draftReport: Report = {
      id: "draft",
      userId: selectedUser,
      periodId: selectedPeriod,
      submittedAt: new Date().toISOString(),
      activities,
      expenses,
      totalDays: totalRecordedDays,
      totalExpenses,
    };
    await exportReportToExcel(draftReport, user, period);
  };

  const canExport = !!selectedUser && !!selectedPeriod && activities.length > 0;

  return (
    <div className="p-5">
      <ReportFilters
        users={state.users}
        periods={state.periods}
        selectedUser={selectedUser}
        selectedPeriod={selectedPeriod}
        onUserChange={setSelectedUser}
        onPeriodChange={setSelectedPeriod}
      />

      {selectedPeriod && (
        <DayCounter
          targetDays={targetDays}
          recordedDays={totalRecordedDays}
          isValid={isValid}
        />
      )}

      <div className="mt-5">
        <ActivityTable
          activities={activities}
          areas={state.areas}
          onAdd={addActivity}
          onUpdate={updateActivity}
          onDelete={deleteActivity}
        />

        <ExpenseTable
          expenses={expenses}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
        />
      </div>

      {/* Export buttons */}
      {canExport && (
        <div className="mb-3 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 border border-white/10 bg-white/5 text-xs text-[#94A3B8] hover:border-[#0296DF]/40 hover:text-white"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 border border-white/10 bg-white/5 text-xs text-[#94A3B8] hover:border-[#10B981]/40 hover:text-white"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full bg-[#0296DF] py-5 text-sm font-semibold tracking-wide text-white transition-all hover:bg-[#0284c7] hover:shadow-lg hover:shadow-[#0296DF]/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send className="mr-2 h-4 w-4" />
        ENVIAR REPORTE QUINCENAL
      </Button>

      {!isValid && selectedPeriod && (
        <p className="mt-2 text-center text-xs text-[#475569]">
          {!selectedUser
            ? "Seleccione un usuario para continuar."
            : "El botón se habilitará cuando los días registrados coincidan exactamente con los días laborables del período."}
        </p>
      )}
    </div>
  );
}
