export interface AccountBalances {
  debit: number;
  expenses: number;
  tfsa: number;
  fhsa: number;
  studentLoans: number;
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
  items: BudgetItem[];
}

export type NavSection = 'dashboard' | 'budget';
