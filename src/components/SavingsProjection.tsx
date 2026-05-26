import type { AccountBalances, MonthData, ExpenseEntry } from '../types';
import { MONTHS, getNetIncome, EXPENSE_CATEGORIES, LOG_TRACKED_IDS, getMonthIndexFromDate } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface Props {
  balances: AccountBalances;
  monthlyData: MonthData[];
  expenses: ExpenseEntry[];
}

function computeLogActualForMonth(expenses: ExpenseEntry[], monthIndex: number, budgetItemId: string): number {
  return expenses
    .filter(e => {
      if (getMonthIndexFromDate(e.date) !== monthIndex) return false;
      const cat = EXPENSE_CATEGORIES.find(c => c.label === e.category);
      return cat?.budgetItemId === budgetItemId;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

interface MonthRow {
  index: number;
  name: string;
  netIncome: number;
  totalBudgeted: number;
  budgetedSurplus: number;
  actualSurplus: number | null;
  budgetedCumulative: number;
  actualCumulative: number | null;
}

export default function SavingsProjection({ balances, monthlyData, expenses }: Props) {
  const startingBalance = Object.values(balances).reduce((a, b) => a + b, 0);

  const rows: MonthRow[] = [];
  let budgetedCumulative = 0;
  let actualCumulative = 0;
  let hasActualSoFar = false;

  for (let i = 0; i < MONTHS.length; i++) {
    const md = monthlyData[i];
    const netIncome = getNetIncome(i);
    const totalBudgeted = md?.items.reduce((s, item) => s + item.budgeted, 0) ?? 0;
    const totalActual = md?.items.reduce((s, item) => {
      if (LOG_TRACKED_IDS.has(item.id)) {
        return s + computeLogActualForMonth(expenses, i, item.id);
      }
      return s + (item.actual || 0);
    }, 0) ?? 0;
    const hasActual = totalActual > 0;

    const budgetedSurplus = netIncome - totalBudgeted;
    budgetedCumulative += budgetedSurplus;

    let actualSurplus: number | null = null;
    if (hasActual) {
      hasActualSoFar = true;
      actualSurplus = netIncome - totalActual;
      actualCumulative += actualSurplus;
    }

    rows.push({
      index: i,
      name: MONTHS[i].short,
      netIncome,
      totalBudgeted,
      budgetedSurplus,
      actualSurplus,
      budgetedCumulative,
      actualCumulative: hasActualSoFar ? actualCumulative : null,
    });
  }

  const totalBudgetedSavings = rows[rows.length - 1].budgetedCumulative;
  const lastActualCumulative = [...rows].reverse().find(r => r.actualCumulative !== null)?.actualCumulative ?? 0;

  const projectedNetWorth = startingBalance + totalBudgetedSavings;

  const chartData = rows.map(r => ({
    name: r.name,
    budgeted: parseFloat((r.budgetedCumulative).toFixed(2)),
    actual: r.actualCumulative !== null ? parseFloat(r.actualCumulative.toFixed(2)) : undefined,
  }));

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Savings Projection</h1>
          <p className="section-subtitle">16-month forecast · May 2026 – Aug 2027</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-label">Starting Net Worth</div>
          <div className="stat-value">{formatCAD(startingBalance)}</div>
          <div className="stat-sub">all accounts combined</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Projected Cash Saved</div>
          <div className="stat-value">{formatCAD(totalBudgetedSavings)}</div>
          <div className="stat-sub">budgeted surpluses only</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Actual Saved to Date</div>
          <div className="stat-value">{formatCAD(lastActualCumulative)}</div>
          <div className="stat-sub">based on entered data</div>
        </div>
        <div className="stat-card stat-card--accent">
          <div className="stat-label">
            <TrendingUp size={14} className="inline mr-1" />
            Projected Net Worth
          </div>
          <div className="stat-value">{formatCAD(projectedNetWorth)}</div>
          <div className="stat-sub">end of internship</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h2 className="card-title">Cumulative Savings Over 16 Months</h2>
        <p className="card-hint" style={{ marginBottom: '1rem' }}>
          Budgeted line shows the plan. Actual line appears as you log expenses.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B5744' }} />
            <YAxis
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 12, fill: '#6B5744' }}
            />
            <Tooltip
              formatter={(v) => formatCAD(Number(v))}
              contentStyle={{ background: '#FAF8F4', border: '1px solid #E8DDD0', borderRadius: '8px' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="budgeted"
              name="Budgeted"
              stroke="#8B6D3F"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#6B8F5E"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#6B8F5E' }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Projection table */}
      <div className="card">
        <h2 className="card-title">Month-by-Month Breakdown</h2>
        <div className="projection-table-wrap">
          <table className="projection-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Month</th>
                <th>Net Income</th>
                <th>Budgeted Out</th>
                <th>Budgeted Surplus</th>
                <th>Actual Surplus</th>
                <th>Projected Cumulative</th>
                <th>Actual Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.index} className={row.index % 2 === 0 ? 'row-even' : ''}>
                  <td className="td-num">{row.index + 1}</td>
                  <td className="td-name">{MONTHS[row.index].name}</td>
                  <td>{formatCAD(row.netIncome)}</td>
                  <td>{formatCAD(row.totalBudgeted)}</td>
                  <td className={row.budgetedSurplus >= 0 ? 'pos' : 'neg'}>
                    {formatCAD(row.budgetedSurplus)}
                  </td>
                  <td className={row.actualSurplus !== null ? (row.actualSurplus >= 0 ? 'pos' : 'neg') : ''}>
                    {row.actualSurplus !== null ? formatCAD(row.actualSurplus) : '—'}
                  </td>
                  <td className="td-cumulative">{formatCAD(row.budgetedCumulative)}</td>
                  <td className="td-cumulative">
                    {row.actualCumulative !== null ? formatCAD(row.actualCumulative) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tfoot-row">
                <td colSpan={6} className="tfoot-label">Total Cash Savings (Budgeted)</td>
                <td className="tfoot-value pos">{formatCAD(totalBudgetedSavings)}</td>
                <td className="tfoot-value pos">{lastActualCumulative > 0 ? formatCAD(lastActualCumulative) : '—'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Investment summary */}
        <div className="investment-summary">
          <h3 className="investment-title">End-of-Internship Estimates</h3>
          <div className="investment-grid">
            <div className="inv-row">
              <span className="inv-label">Projected cash savings</span>
              <span className="inv-value">{formatCAD(totalBudgetedSavings)}</span>
            </div>
            <div className="inv-row">
              <span className="inv-label">+ Current TFSA</span>
              <span className="inv-value">{formatCAD(balances.tfsa)}</span>
            </div>
            <div className="inv-row">
              <span className="inv-label">+ Current RRSP</span>
              <span className="inv-value">{formatCAD(balances.rrsp)}</span>
            </div>
            <div className="inv-row">
              <span className="inv-label">+ Savings account</span>
              <span className="inv-value">{formatCAD(balances.savings)}</span>
            </div>
            <div className="inv-row">
              <span className="inv-label">+ Wealthsimple *</span>
              <span className="inv-value">{formatCAD(balances.wealthsimple)}</span>
            </div>
            <div className="inv-row inv-row--total">
              <span className="inv-label">Grand Total Projected Net Worth</span>
              <span className="inv-value">{formatCAD(projectedNetWorth)}</span>
            </div>
          </div>
          <p className="disclaimer">
            * Investment accounts (TFSA, RRSP, Wealthsimple) reflect current balances only — market returns not modelled.
          </p>
        </div>
      </div>
    </div>
  );
}
