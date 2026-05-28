export interface Account {
  id: string;
  name: string;
  amount: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  current: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  category: string;
  budgeted?: number; // legacy field, no longer shown in UI
  actual: number;
}

export interface MonthData {
  monthIndex: number;
  monthlyIncome: number;
  items: BudgetItem[];
}

export interface KanbanTask {
  id: string;
  title: string;
  category: string;
  dueDate: string;   // YYYY-MM-DD or ''
  status: 'not-started' | 'in-progress' | 'done';
  createdAt: number;
}

export type NavSection = 'dashboard' | 'budget' | 'kanban';
