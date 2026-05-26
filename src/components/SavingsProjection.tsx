import type { AccountBalances, MonthData } from '../types';
import { MONTHS } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface Props {
  balances: AccountBalances;
  monthlyData: MonthData[];
  monthlyIncome: number;
}

interface MonthRow {
  index: number;
  name: string;
  totalIncome: number;
  totalBudgeted: number;
  budgetedSurplus: number;
  actualSurplus: number | null;
  budgetedCumulative: number;
  actualCumulative: number | null;
}

export default function SavingsProjection({ balances, monthlyData, monthlyIncome }: Props) {
  const rows: MonthRow[] = [];
  let budgetedCumulative = 0;
  let actualCumulative = 0;
  let hasActualSoFar = false;

  for (let i = 0; i < MONTHS.length; i++) {
    const md = monthlyData[i];
    const extraIncome = md?.items.filter(x => x.kind === 'income').reduce((s, x) => s + x.budgeted, 0) ?? 0;
    const totalIncome = monthlyIncome + extraIncome;
    const totalBudgeted = md?.items.filter(x => x.kind === 'expense').reduce((s, x) => s + x.budgeted, 0) ?? 0;
    const totalActual = md?.items.filter(x => x.kind === 'expense').reduce((s, x) => s + x.actual, 0) ?? 0;
    const hasActual = totalActual > 0;

    const budgetedSurplus = totalIncome - totalBudgeted;
    budgetedCumulative += budgetedSurplus;

    let actualSurplus: number | null = null;
    if (hasActual) {
      hasActualSoFar = true;
      actualSurplus = totalIncome - totalActual;
      actualCumulative += actualSurplus;
    }

    rows.push({
      index: i,
      name: MONTHS[i].short,
      totalIncome,
      totalBudgeted,
      budgetedSurplus,
      actualSurplus,
      budgetedCumulative,
      actualCumulative: hasActualSoFar ? actualCumulative : null,
    });
  }

  const totalBudgetedSavings = rows[rows.length - 1].budgetedCumulative;
  const lastActualCumulative = [...rows].reverse().find(r => r.actualCumulative !== null)?.actualCumulative ?? 0;

  const chartData = rows.map(r => ({
    name: r.name,
    budgeted: parseFloat(r.budgetedCumulative.toFixed(2)),
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

      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-label">Projected Cash Saved</div>
          <div className="stat-value">{formatCAD(totalBudgetedSavings)}</div>
          <div className="stat-sub">budgeted surpluses</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Actual Saved to Date</div>
          <div className="stat-value">{formatCAD(lastActualCumulative)}</div>
          <div className="stat-sub">based on entered data</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current TFSA</div>
          <div className="stat-value">{formatCAD(balances.tfsa)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current FHSA</div>
          <div className="stat-value">{formatCAD(balances.fhsa)}</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Cumulative Savings Over 16 Months</h2>
        <p className="card-hint" style={{ marginBottom: '1rem' }}>
          Budgeted line shows the plan. Actual line appears as you enter actuals.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B5744' }} />
            <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#6B5744' }} />
            <Tooltip
              formatter={(v) => formatCAD(Number(v))}
              contentStyle={{ background: '#FAF8F4', border: '1px solid #E8DDD0', borderRadius: '8px' }}
            />
            <Legend />
            <Line type="monotone" dataKey="budgeted" name="Budgeted" stroke="#8B6D3F" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#6B8F5E" strokeWidth={2.5} dot={{ r: 4, fill: '#6B8F5E' }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2 className="card-title">Month-by-Month Breakdown</h2>
        <div className="projection-table-wrap">
          <table className="projection-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Month</th>
                <th>Income</th>
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
                  <td>{formatCAD(row.totalIncome)}</td>
                  <td>{formatCAD(row.totalBudgeted)}</td>
                  <td className={row.budgetedSurplus >= 0 ? 'pos' : 'neg'}>{formatCAD(row.budgetedSurplus)}</td>
                  <td className={row.actualSurplus !== null ? (row.actualSurplus >= 0 ? 'pos' : 'neg') : ''}>
                    {row.actualSurplus !== null ? formatCAD(row.actualSurplus) : '—'}
                  </td>
                  <td className="td-cumulative">{formatCAD(row.budgetedCumulative)}</td>
                  <td className="td-cumulative">{row.actualCumulative !== null ? formatCAD(row.actualCumulative) : '—'}</td>
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
      </div>
    </div>
  );
}
