import type { Account, MonthData } from '../types';

export const DATA_VERSION = 6;

const YEAR = new Date().getFullYear();
export const MONTHS = [
  { index: 0,  name: `January ${YEAR}`,   short: 'Jan' },
  { index: 1,  name: `February ${YEAR}`,  short: 'Feb' },
  { index: 2,  name: `March ${YEAR}`,     short: 'Mar' },
  { index: 3,  name: `April ${YEAR}`,     short: 'Apr' },
  { index: 4,  name: `May ${YEAR}`,       short: 'May' },
  { index: 5,  name: `June ${YEAR}`,      short: 'Jun' },
  { index: 6,  name: `July ${YEAR}`,      short: 'Jul' },
  { index: 7,  name: `August ${YEAR}`,    short: 'Aug' },
  { index: 8,  name: `September ${YEAR}`, short: 'Sep' },
  { index: 9,  name: `October ${YEAR}`,   short: 'Oct' },
  { index: 10, name: `November ${YEAR}`,  short: 'Nov' },
  { index: 11, name: `December ${YEAR}`,  short: 'Dec' },
];

export const EXPENSE_TYPES = [
  'Restaurant', 'Gas', 'Groceries', 'Personal', 'Rent', 'Investments',
] as const;

export const INCOME_TYPES = [
  'Salary', 'Bonus', 'Other',
] as const;

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'debit',        name: 'Chequing / Debit', amount: 0 },
  { id: 'expenses',     name: 'Expenses',          amount: 0 },
  { id: 'tfsa',         name: 'TFSA',              amount: 0 },
  { id: 'fhsa',         name: 'FHSA',              amount: 0 },
  { id: 'studentLoans', name: 'Student Loans',     amount: 0 },
];

export function buildDefaultMonthlyData(): MonthData[] {
  return MONTHS.map(m => ({ monthIndex: m.index, monthlyIncome: 0, items: [] }));
}

export function migrateMonthlyData(stored: MonthData[], globalIncome = 0): MonthData[] {
  return stored.map(md => ({
    ...md,
    monthlyIncome: (md as MonthData & { monthlyIncome?: number }).monthlyIncome ?? globalIncome,
    items: (md.items ?? []).map(item => ({
      ...item,
      kind: item.kind ?? 'expense',
      category: item.category ?? 'Other',
    })),
  }));
}
