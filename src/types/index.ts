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
  budgeted: number;
  actual: number;
}

export interface MonthData {
  monthIndex: number;
  monthlyIncome: number;
  items: BudgetItem[];
}

export type NavSection = 'dashboard' | 'budget';
