export interface User {
  id: string;
  name: string;
}

export interface BillingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  workingDays?: number | null; // null = usar cálculo automático
}

export interface Project {
  name: string;
  clientName: string;
}

/**
 * A dedication is work done for a client; a non-working entry is leave or
 * holiday. Both consume days of the period, so they share this table and both
 * count toward the period's target — they differ in how they are entered and
 * shown, not in what they mean for the day count.
 */
export type ActivityKind = "dedication" | "non_working";

export interface Activity {
  id: string;
  description: string;
  client: string;
  project: string;
  days: number;
  kind: ActivityKind;
}

export interface Expense {
  id: string;
  description: string;
  category: string;
  client: string;
  project: string;
  amount: number;
  expenseDate: string;   // ISO date "YYYY-MM-DD", empty = not set
  fileName: string | null;
  fileData: string | null;
}

export interface Report {
  id: string;
  userId: string;
  periodId: string;
  status: "draft" | "submitted";
  submittedAt: string;
  savedAt?: string | null;
  activities: Activity[];
  expenses: Expense[];
  totalDays: number;
  totalExpenses: number;
}

export interface AppState {
  users: User[];
  periods: BillingPeriod[];
  reports: Report[];
  clients: string[];
  projects: Project[];
  expenseCategories: string[];
}
