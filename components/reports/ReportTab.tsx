"use client";

import { useState, useMemo, useEffect } from "react";
import { Send, Download, FileSpreadsheet, Save, CheckCircle2 } from "lucide-react";
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

  const [selectedUser,   setSelectedUser]   = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [activities,     setActivities]     = useState<Activity[]>([]);
  const [expenses,       setExpenses]       = useState<Expense[]>([]);
  const [draftId,        setDraftId]        = useState<string | null>(null);
  const [lastSaved,      setLastSaved]      = useState<string | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [submitting,     setSubmitting]     = useState(false);

  // ── Find existing report for this user + period ────────────────────────────
  const existingReport = useMemo(
    () =>
      selectedUser && selectedPeriod
        ? state.reports.find(
            (r) => r.userId === selectedUser && r.periodId === selectedPeriod
          )
        : undefined,
    [state.reports, selectedUser, selectedPeriod]
  );

  const isSubmitted = existingReport?.status === "submitted";

  // ── Load draft when user+period selection changes ──────────────────────────
  useEffect(() => {
    if (existingReport) {
      setActivities(existingReport.activities);
      setExpenses(existingReport.expenses);
      setDraftId(existingReport.id);
      setLastSaved(existingReport.savedAt ?? existingReport.submittedAt ?? null);
    } else {
      setActivities([]);
      setExpenses([]);
      setDraftId(null);
      setLastSaved(null);
    }
  }, [existingReport]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const targetDays = useMemo(() => {
    const p = state.periods.find((x) => x.id === selectedPeriod);
    if (!p) return 0;
    return p.workingDays != null
      ? p.workingDays
      : calculateWorkingDays(p.startDate, p.endDate);
  }, [state.periods, selectedPeriod]);

  const totalRecordedDays = useMemo(
    () => activities.reduce((s, a) => s + a.days, 0),
    [activities]
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const canSave      = !!selectedUser && !!selectedPeriod;
  const isSubmitValid =
    totalRecordedDays === targetDays &&
    targetDays > 0 &&
    !!selectedUser &&
    !!selectedPeriod;

  // ── Activity handlers ──────────────────────────────────────────────────────
  const addActivity = () =>
    setActivities((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", client: "", project: "", days: 0 },
    ]);

  const updateActivity = (id: string, field: keyof Activity, value: string | number) =>
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );

  const deleteActivity = (id: string) =>
    setActivities((prev) => prev.filter((a) => a.id !== id));

  // ── Expense handlers ───────────────────────────────────────────────────────
  const addExpense = () =>
    setExpenses((prev) => [
      ...prev,
      { id: Date.now().toString(), description: "", amount: 0, fileName: null, fileData: null },
    ]);

  const updateExpense = (id: string, field: keyof Expense, value: string | number | null) =>
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );

  const deleteExpense = (id: string) =>
    setExpenses((prev) => prev.filter((e) => e.id !== id));

  // ── Build report snapshot ──────────────────────────────────────────────────
  const buildReport = (status: "draft" | "submitted", id: string): Report => ({
    id,
    userId:        selectedUser,
    periodId:      selectedPeriod,
    status,
    submittedAt:   status === "submitted"
                     ? new Date().toISOString()
                     : (existingReport?.submittedAt ?? new Date().toISOString()),
    savedAt:       new Date().toISOString(),
    activities,
    expenses,
    totalDays:     totalRecordedDays,
    totalExpenses,
  });

  // ── Save draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!canSave || saving) return;
    setSaving(true);

    const id  = draftId ?? Date.now().toString();
    const now = new Date().toISOString();
    setDraftId(id);
    setLastSaved(now);

    await dispatch({ type: "SAVE_DRAFT", payload: buildReport("draft", id) });
    setSaving(false);
  };

  // ── Submit final report ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isSubmitValid || submitting) return;
    setSubmitting(true);

    const id = draftId ?? Date.now().toString();
    setDraftId(id);

    // Save the final data first, then flip the status
    await dispatch({ type: "SAVE_DRAFT",    payload: buildReport("draft", id) });
    await dispatch({ type: "SUBMIT_REPORT", payload: id });

    setSubmitting(false);
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const getExportReport = (): Report => ({
    id:            draftId ?? "draft",
    userId:        selectedUser,
    periodId:      selectedPeriod,
    status:        existingReport?.status ?? "draft",
    submittedAt:   existingReport?.submittedAt ?? new Date().toISOString(),
    activities,
    expenses,
    totalDays:     totalRecordedDays,
    totalExpenses,
  });

  const handleExportPDF = async () => {
    if (!selectedUser || !selectedPeriod) return;
    const user   = state.users.find((u) => u.id === selectedUser);
    const period = state.periods.find((p) => p.id === selectedPeriod);
    if (!user || !period) return;
    await exportReportToPDF(getExportReport(), user, period);
  };

  const handleExportExcel = async () => {
    if (!selectedUser || !selectedPeriod) return;
    const user   = state.users.find((u) => u.id === selectedUser);
    const period = state.periods.find((p) => p.id === selectedPeriod);
    if (!user || !period) return;
    await exportReportToExcel(getExportReport(), user, period);
  };

  const canExport = !!selectedUser && !!selectedPeriod && activities.length > 0;

  // ── Last-saved label ───────────────────────────────────────────────────────
  const lastSavedText = useMemo(() => {
    if (!lastSaved) return null;
    return new Date(lastSaved).toLocaleString("es-MX", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  }, [lastSaved]);

  // ── Render ─────────────────────────────────────────────────────────────────
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

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
          <span className="text-sm text-[#10B981]">
            Reporte enviado el{" "}
            {new Date(existingReport!.submittedAt).toLocaleString("es-MX", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Draft indicator */}
      {!isSubmitted && lastSavedText && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#64748B]">
          <Save className="h-3 w-3" />
          <span>Borrador guardado: {lastSavedText}</span>
        </div>
      )}

      {selectedPeriod && (
        <DayCounter
          targetDays={targetDays}
          recordedDays={totalRecordedDays}
          isValid={isSubmitValid}
        />
      )}

      <div className="mt-5">
        <ActivityTable
          activities={activities}
          clients={state.clients}
          projects={state.projects}
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

      {/* ── Action area for draft/active reports ── */}
      {!isSubmitted && (
        <div className="mt-4 space-y-3">
          {canExport && (
            <div className="flex gap-2">
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

          {/* Guardar avance */}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!canSave || saving}
            className="w-full border-white/10 bg-white/5 py-5 text-sm font-medium text-[#94A3B8] hover:border-[#0296DF]/40 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "GUARDANDO…" : "GUARDAR AVANCE"}
          </Button>

          {/* Enviar reporte */}
          <Button
            onClick={handleSubmit}
            disabled={!isSubmitValid || submitting}
            className="w-full bg-[#0296DF] py-5 text-sm font-semibold tracking-wide text-white transition-all hover:bg-[#0284c7] hover:shadow-lg hover:shadow-[#0296DF]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "ENVIANDO…" : "ENVIAR REPORTE QUINCENAL"}
          </Button>

          {!isSubmitValid && selectedPeriod && (
            <p className="text-center text-xs text-[#475569]">
              {!selectedUser
                ? "Seleccione un usuario para continuar."
                : "El botón de envío se habilitará cuando los días registrados coincidan con los días laborables del período."}
            </p>
          )}
        </div>
      )}

      {/* ── Action area for submitted reports (export only) ── */}
      {isSubmitted && canExport && (
        <div className="mt-4 flex gap-2">
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
    </div>
  );
}
