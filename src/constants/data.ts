import type { AccountBalances, BudgetItem, MonthData } from '../types';

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

export const SALARY_PHASES = [
  { months: [0, 1, 2, 3], rate: 34, gross: 5100, net: 4850 },
  { months: [4, 5, 6, 7], rate: 35.5, gross: 5325, net: 5075 },
  { months: [8, 9, 10, 11], rate: 37, gross: 5550, net: 5300 },
  { months: [12, 13, 14, 15], rate: 38.5, gross: 5775, net: 5525 },
];

export function getNetIncome(monthIndex: number): number {
  const phase = SALARY_PHASES.find(p => p.months.includes(monthIndex));
  return phase?.net ?? 4850;
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

function makeFixedItems(monthIndex: number): BudgetItem[] {
  const investmentContrib = monthIndex <= 1 ? 100 : 200;
  return [
    { id: 'rent',      name: 'Rent',              budgeted: 1380,             actual: 0, category: 'fixed',   locked: true },
    { id: 'utilities', name: 'Utilities',          budgeted: 70,               actual: 0, category: 'fixed',   locked: true },
    { id: 'transit',   name: 'Transit',            budgeted: 100,              actual: 0, category: 'fixed',   locked: true },
    { id: 'calgary',   name: 'Calgary Trip',       budgeted: 100,              actual: 0, category: 'fixed',   locked: true },
    { id: 'groceries', name: 'Groceries',          budgeted: 200,              actual: 0, category: 'fixed',   locked: true },
    { id: 'misc',      name: 'Miscellaneous',      budgeted: 200,              actual: 0, category: 'fixed',   locked: true },
    { id: 'rrsp',      name: 'RRSP Contribution',  budgeted: investmentContrib, actual: 0, category: 'savings', locked: true },
    { id: 'tfsa',      name: 'TFSA Contribution',  budgeted: investmentContrib, actual: 0, category: 'savings', locked: true },
  ];
}

function buildMonthItems(monthIndex: number): BudgetItem[] {
  const items = makeFixedItems(monthIndex);

  if (monthIndex <= 2) {
    items.push({ id: 'nyc-savings', name: 'NYC Trip Savings', budgeted: 500, actual: 0, category: 'savings', locked: true });
  }
  if (monthIndex === 0) {
    // Credit card payoff removed — paid from existing debit balance, not May income
    items.push({ id: 'learn-row',  name: 'Learn to Row',       budgeted: 304.75, actual: 0, category: 'one-time', locked: true });
  }
  if (monthIndex === 2) {
    items.push({ id: 'rowing-membership', name: 'Rowing Membership', budgeted: 625,  actual: 0, category: 'one-time', locked: true });
  }
  if (monthIndex === 3) {
    items.push({ id: 'nyc-trip', name: 'NYC Trip', budgeted: 1500, actual: 0, category: 'one-time', locked: true });
  }

  return items;
}

export function buildDefaultMonthlyData(): MonthData[] {
  return MONTHS.map(m => ({
    monthIndex: m.index,
    items: buildMonthItems(m.index),
  }));
}

// IDs that should never appear in the budget (paid from existing balances, not income)
const REMOVED_ITEM_IDS = new Set(['cc-payoff']);

// Migration: bring stored monthlyData up to the current DATA_VERSION
export function migrateMonthlyData(stored: MonthData[]): MonthData[] {
  return stored.map(md => {
    const defaults = buildMonthItems(md.monthIndex);
    const merged = defaults.map(def => {
      const existing = md.items.find(i => i.id === def.id);
      if (!existing) return def;
      return { ...existing, budgeted: def.budgeted };
    });
    const customItems = md.items.filter(i => !i.locked && !REMOVED_ITEM_IDS.has(i.id));
    const filteredMerged = merged.filter(i => !REMOVED_ITEM_IDS.has(i.id));
    return { ...md, items: [...filteredMerged, ...customItems] };
  });
}
