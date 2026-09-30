import type { Activity } from "@/types";

/**
 * Leave and holiday entries are stored as activities so they count toward the
 * period's day target and flow to the sheet and the exports unchanged. They
 * carry a fixed client and project, which the form does not show: the worker
 * only picks the type and the number of days.
 */
export const NON_WORKING_CLIENT  = "Zota IA Consulting";
export const NON_WORKING_PROJECT = "Área - Administración";

export const NON_WORKING_TYPES = ["Días de Licencia", "Vacaciones"] as const;

export type NonWorkingType = (typeof NON_WORKING_TYPES)[number];

export function isNonWorking(a: Activity): boolean {
  return a.kind === "non_working";
}

export function newNonWorkingEntry(): Activity {
  return {
    id:          Date.now().toString(),
    description: "",
    client:      NON_WORKING_CLIENT,
    project:     NON_WORKING_PROJECT,
    days:        0,
    kind:        "non_working",
  };
}

/** A row is ready to submit once it has a type and a positive number of days. */
export function isCompleteNonWorking(a: Activity): boolean {
  return (
    NON_WORKING_TYPES.includes(a.description as NonWorkingType) && a.days > 0
  );
}
