import type { AccountBalances, MonthData } from '../types';

export const DATA_VERSION = 3;

export const MONTHS = [
  { index: 0, name: 'May 2026', short: 'May \'26' },
  { index: 1, name: 'Jun 2026', short: 'Jun \'26' },
  { index: 2, name: 'Jul 2026', short: 'Jul \'26' },
  { index: 3, name: 'Aug 2026', short: 'Aug \'26' },
  { index: 4, name: 'Sep 2026', short: 'Sep \'26' },
  { index: 5, name: 'Oct 2026', short: 'Oct \'26' },
  { index: 6, name: 'Nov 2026', short: 'Nov \'26' },
  { index: 7, name: 'Dec 2026', short: 'Dec \'26' },
  { index: 8, name: 'Jan 2027', short: 'Jan \'27' },
  { index: 9, name: 'Feb 2027', short: 'Feb \'27' },
  { index: 10, name: 'Mar 2027', short: 'Mar \'27' },
  { index: 11, name: 'Apr 2027', short: 'Apr \'27' },
  { index: 12, name: 'May 2027', short: 'May \'27' },
  { index: 13, name: 'Jun 2027', short: 'Jun \'27' },
  { index: 14, name: 'Jul 2027', short: 'Jul \'27' },
  { index: 15, name: 'Aug 2027', short: 'Aug \'27' },
];

// Month date ranges for mapping expense dates → month index
const MONTH_RANGES = [
  { start: '2026-05-01', end: '2026-05-31' },
  { start: '2026-06-01', end: '2026-06-30' },
  { start: '2026-07-01', end: '2026-07-31' },
  { start: '2026-08-01', end: '2026-08-31' },
  { start: '2026-09-01', end: '2026-09-30' },
  { start: '2026-10-01', end: '2026-10-31' },
  { start: '2026-11-01', end: '2026-11-30' },
  { start: '2026-12-01', end: '2026-12-31' },
  { start: '2027-01-01', end: '2027-01-31' },
  { start: '2027-02-01', end: '2027-02-28' },
  { start: '2027-03-01', end: '2027-03-31' },
  { start: '2027-04-01', end: '2027-04-30' },
  { start: '2027-05-01', end: '2027-05-31' },
  { start: '2027-06-01', end: '2027-06-30' },
  { start: '2027-07-01', end: '2027-07-31' },
  { start: '2027-08-01', end: '2027-08-31' },
];

export function getMonthIndexFromDate(dateStr: string): number {
  return MONTH_RANGES.findIndex(r => dateStr >= r.start && dateStr <= r.end);
}

export const DEFAULT_BALANCES: AccountBalances = {
  debit: 0,
  savings: 0,
  tfsa: 0,
  rrsp: 0,
  wealthsimple: 0,
};

// Expense log categories and which budget item ID they feed into
export const EXPENSE_CATEGORIES: { label: string; budgetItemId: string | null }[] = [
  { label: 'Rent',          budgetItemId: 'rent' },
  { label: 'Groceries',     budgetItemId: 'groceries' },
  { label: 'Transit',       budgetItemId: 'transit' },
  { label: 'Utilities',     budgetItemId: 'utilities' },
  { label: 'Entertainment', budgetItemId: 'misc' },
  { label: 'Shopping',      budgetItemId: 'misc' },
  { label: 'Health',        budgetItemId: 'misc' },
  { label: 'Calgary Trip',  budgetItemId: 'calgary' },
  { label: 'Other',         budgetItemId: 'misc' },
];

// Budget item IDs whose "actual" is computed from the expense log (not manual)
export const LOG_TRACKED_IDS = new Set(['rent', 'utilities', 'transit', 'calgary', 'groceries', 'misc']);

export function buildDefaultMonthlyData(): MonthData[] {
  return MONTHS.map(m => ({
    monthIndex: m.index,
    netIncome: 0,
    items: [],
  }));
}

// Migration: ensure shape is correct, never inject hardcoded data
export function migrateMonthlyData(stored: MonthData[]): MonthData[] {
  return stored.map(md => ({
    ...md,
    netIncome: md.netIncome ?? 0,
    items: md.items ?? [],
  }));
}
