export interface AccountBalances {
  debit: number;
  savings: number;
  tfsa: number;
  rrsp: number;
  wealthsimple: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  category: 'fixed' | 'savings' | 'one-time' | 'custom';
  locked: boolean;
}

export interface MonthData {
  monthIndex: number;
  items: BudgetItem[];
}

export interface ExpenseEntry {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export type NavSection = 'dashboard' | 'budget' | 'expenses' | 'savings';
