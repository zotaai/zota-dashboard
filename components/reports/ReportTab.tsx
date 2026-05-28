"use client";

import { useState, useMemo, useEffect } from "react";
import { Send, Download, FileSpreadsheet, Save, CheckCircle2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStore } from "@/lib/store";
import { calculateWorkingDays } from "@/lib/calculations";
import { exportReportToPDF } from "@/lib/export-pdf";
import { exportReportToExcel } from "@/lib/export-excel";
import { ReportFilters } from "./ReportFilters";
import { ActivityTable } from "./ActivityTable";
import { ExpenseTable } from "./ExpenseTable";
import { DayCounter } from "./DayCounter";
import type { Activity, Expense, Report } from "@/types";

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: "Usuario"  },
  { n: 2, label: "Período"  },
  { n: 3, label: "Registro" },
  { n: 4, label: "Guardar"  },
  { n: 5, label: "Enviar"   },
];

function StepIndicator({ current, done }: { current: number; done: boolean }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      {STEPS.map((step, i) => {
        const completed = done || step.n < current;
        const active    = !done && step.n === current;
        const pending   = !done && step.n > current;

        return (
          <div key={step.n} className="flex flex-1 items-center">
            {/* Circle */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  completed
                    ? "bg-[#0296DF] text-white"
                    : active
                    ? "border-2 border-[#0296DF] bg-transparent text-[#0296DF]"
                    : "border border-black/10 bg-black/[0.04] text-[#94A3B8]"
                }`}
              >
                {completed ? <Check className="h-3.5 w-3.5" /> : step.n}
              </div>
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  completed ? "text-[#0296DF]" : active ? "text-[#1E293B]" : "text-[#94A3B8]"
                }`}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (not after last step) */}
            {i < STEPS.length - 1 && (
              <div
                className={`mx-1 mb-4 h-px flex-1 transition-all ${
                  step.n < current || done ? "bg-[#0296DF]/60" : "bg-black/[0.06]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

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
  const [successModal,   setSuccessModal]   = useState<"draft" | "submitted" | null>(null);

  // ── Find existing report ───────────────────────────────────────────────────
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

  // ── Load draft when selection changes ─────────────────────────────────────
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

  // ── Step logic ─────────────────────────────────────────────────────────────
  const step1 = !!selectedUser;
  const step2 = step1 && !!selectedPeriod;
  const hasRecords    = activities.length > 0 || expenses.length > 0;
  const step3         = step2 && hasRecords;
  const hoursComplete = totalRecordedDays >= targetDays && targetDays > 0;
  const canSaveDraft  = step3 && !hoursComplete && !isSubmitted;
  const canSubmit     = step3 && hoursComplete  && !isSubmitted;

  // Current active step for the indicator
  const currentStep = isSubmitted ? 5
    : canSubmit     ? 5
    : step3         ? 4
    : step2         ? 3
    : step1         ? 2
    : 1;

  // ── Hint message ───────────────────────────────────────────────────────────
  const hint = isSubmitted ? null
    : !step1        ? "Selecciona tu usuario para comenzar."
    : !step2        ? "Ahora selecciona el período quincen al."
    : !step3        ? "Añade al menos una dedicación o gasto para continuar."
    : !hoursComplete
      ? `Registra ${(targetDays - totalRecordedDays).toFixed(1)} día(s) más para poder enviar. Puedes guardar tu avance.`
    : "¡Días completos! Ya puedes enviar tu reporte.";

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
      { id: Date.now().toString(), description: "", category: "", client: "", project: "", amount: 0, expenseDate: "", fileName: null, fileData: null },
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
    if (!canSaveDraft || saving) return;
    setSaving(true);
    const id  = draftId ?? Date.now().toString();
    setDraftId(id);
    setLastSaved(new Date().toISOString());
    await dispatch({ type: "SAVE_DRAFT", payload: buildReport("draft", id) });
    setSaving(false);
    setSuccessModal("draft");
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const id = draftId ?? Date.now().toString();
    setDraftId(id);
    await dispatch({ type: "SAVE_DRAFT",    payload: buildReport("draft", id) });
    await dispatch({ type: "SUBMIT_REPORT", payload: id });
    setSubmitting(false);
    setSuccessModal("submitted");
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const getExportReport = (): Report => ({
    id:           draftId ?? "draft",
    userId:       selectedUser,
    periodId:     selectedPeriod,
    status:       existingReport?.status ?? "draft",
    submittedAt:  existingReport?.submittedAt ?? new Date().toISOString(),
    activities,
    expenses,
    totalDays:    totalRecordedDays,
    totalExpenses,
  });

  const handleExportPDF = async () => {
    if (!step2) return;
    const user   = state.users.find((u) => u.id === selectedUser);
    const period = state.periods.find((p) => p.id === selectedPeriod);
    if (!user || !period) return;
    await exportReportToPDF(getExportReport(), user, period);
  };

  const handleExportExcel = async () => {
    if (!step2) return;
    const user   = state.users.find((u) => u.id === selectedUser);
    const period = state.periods.find((p) => p.id === selectedPeriod);
    if (!user || !period) return;
    await exportReportToExcel(getExportReport(), user, period);
  };

  const canExport = step3;

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

      {/* Step indicator */}
      <StepIndicator current={currentStep} done={isSubmitted} />

      {/* Filters */}
      <ReportFilters
        users={state.users}
        periods={state.periods}
        selectedUser={selectedUser}
        selectedPeriod={selectedPeriod}
        onUserChange={setSelectedUser}
        onPeriodChange={setSelectedPeriod}
        periodDisabled={!step1}
      />

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3">
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
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[#64748B]">
          <Save className="h-3 w-3" />
          <span>Borrador guardado: {lastSavedText}</span>
        </div>
      )}

      {/* Hint */}
      {hint && (
        <p className={`mt-3 text-xs ${hoursComplete && step3 ? "text-[#10B981]" : "text-[#64748B]"}`}>
          {hint}
        </p>
      )}

      {/* Day counter */}
      {step2 && (
        <DayCounter
          targetDays={targetDays}
          recordedDays={totalRecordedDays}
          isValid={hoursComplete}
        />
      )}

      {/* ── Tables — locked until period is selected ── */}
      <div className={`mt-5 transition-opacity ${step2 ? "opacity-100" : "pointer-events-none opacity-30"}`}>
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
          clients={state.clients}
          projects={state.projects}
          expenseCategories={state.expenseCategories}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onDelete={deleteExpense}
        />
      </div>

      {/* ── Action area ── */}
      {!isSubmitted && (
        <div className="mt-4 space-y-3">
          {/* Export buttons — only when there are records */}
          {canExport && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPDF}
                className="h-8 border border-black/[0.08] bg-black/[0.04] text-xs text-[#475569] hover:border-[#0296DF]/40 hover:text-[#1E293B]"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Exportar PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 border border-black/[0.08] bg-black/[0.04] text-xs text-[#475569] hover:border-[#10B981]/40 hover:text-[#1E293B]"
              >
                <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                Exportar Excel
              </Button>
            </div>
          )}

          {/* Step 4 — Guardar Avance (only when hours incomplete) */}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!canSaveDraft || saving}
            className="w-full border-black/[0.08] bg-black/[0.04] py-5 text-sm font-medium text-[#475569] hover:border-[#0296DF]/40 hover:bg-black/[0.06] hover:text-[#1E293B] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "GUARDANDO…" : "GUARDAR AVANCE"}
          </Button>

          {/* Step 5 — Enviar Reporte (only when hours complete) */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full bg-[#0296DF] py-5 text-sm font-semibold tracking-wide text-white transition-all hover:bg-[#0284c7] hover:shadow-lg hover:shadow-[#0296DF]/20 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "ENVIANDO…" : "ENVIAR REPORTE QUINCENAL"}
          </Button>
        </div>
      )}

      {/* Export only for submitted reports */}
      {isSubmitted && canExport && (
        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 border border-black/[0.08] bg-black/[0.04] text-xs text-[#475569] hover:border-[#0296DF]/40 hover:text-[#1E293B]"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Exportar PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 border border-black/[0.08] bg-black/[0.04] text-xs text-[#475569] hover:border-[#10B981]/40 hover:text-[#1E293B]"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            Exportar Excel
          </Button>
        </div>
      )}

      {/* ── Success modals ── */}
      <Dialog open={successModal === "draft"} onOpenChange={() => setSuccessModal(null)}>
        <DialogContent className="border border-black/[0.08] bg-white text-[#1E293B] sm:max-w-sm">
          <DialogHeader className="items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0296DF]/15">
              <Save className="h-6 w-6 text-[#0296DF]" />
            </div>
            <DialogTitle className="text-base font-semibold text-[#1E293B]">
              Avance guardado
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-[#475569]">
              Tu progreso fue guardado correctamente. Puedes continuar registrando
              actividades y volver a guardar cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              onClick={() => setSuccessModal(null)}
              className="w-full bg-[#0296DF] text-sm font-medium text-white hover:bg-[#0284c7]"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={successModal === "submitted"} onOpenChange={() => setSuccessModal(null)}>
        <DialogContent className="border border-black/[0.08] bg-white text-[#1E293B] sm:max-w-sm">
          <DialogHeader className="items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/15">
              <CheckCircle2 className="h-6 w-6 text-[#10B981]" />
            </div>
            <DialogTitle className="text-base font-semibold text-[#1E293B]">
              Reporte enviado
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-[#475569]">
              Se registró el reporte quincenal correctamente. Ya no podrás
              realizar cambios en este período.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              onClick={() => setSuccessModal(null)}
              className="w-full bg-[#10B981] text-sm font-medium text-white hover:bg-[#059669]"
            >
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
