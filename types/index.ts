export interface User {
  id: string;
  name: string;
}

export interface BillingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface Project {
  name: string;
  clientName: string;
}

export interface Activity {
  id: string;
  description: string;
  client: string;
  project: string;
  days: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  fileName: string | null;
  fileData: string | null;
}

export interface Report {
  id: string;
  userId: string;
  periodId: string;
  submittedAt: string;
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
}
