import { useState } from 'react';
import type { ExpenseEntry } from '../types';
import { EXPENSE_CATEGORIES, MONTHS, getMonthIndexFromDate } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Plus, Trash2, Filter } from 'lucide-react';

interface Props {
  expenses: ExpenseEntry[];
  setExpenses: (e: ExpenseEntry[] | ((prev: ExpenseEntry[]) => ExpenseEntry[])) => void;
}

const PIE_COLORS = ['#8B6D3F', '#6B8F5E', '#C4873A', '#7A5C8A', '#4A7A8A', '#8A4A4A', '#5A7A4A', '#8A7A4A', '#4A5A8A'];
const CATEGORY_LABELS = EXPENSE_CATEGORIES.map(c => c.label);

export default function ExpenseLog({ expenses, setExpenses }: Props) {
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Groceries',
    description: '',
    amount: '',
  });

  function addExpense() {
    if (!form.amount || !form.description) return;
    const entry: ExpenseEntry = {
      id: `exp-${Date.now()}`,
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      amount: parseFloat(form.amount),
    };
    setExpenses(prev => [entry, ...prev]);
    setForm({ date: new Date().toISOString().split('T')[0], category: 'Groceries', description: '', amount: '' });
    setShowForm(false);
  }

  function deleteExpense(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id));
  }

  const filtered = expenses.filter(e => {
    if (filterMonth !== 'all' && getMonthIndexFromDate(e.date) !== filterMonth) return false;
    if (filterCategory !== 'all' && e.category !== filterCategory) return false;
    return true;
  });

  const categoryTotals = filtered.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const pieData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Expense Log</h1>
          <p className="section-subtitle">Every entry here automatically updates your Monthly Budget actuals</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Expense</span>
        </button>
      </div>

      {showForm && (
        <div className="card expense-form-card">
          <h3 className="form-title">New Expense</h3>
          <div className="expense-form-grid">
            <div className="form-field">
              <label className="form-label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="form-input"
              >
                {CATEGORY_LABELS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field form-field--wide">
              <label className="form-label">Description</label>
              <input
                type="text"
                placeholder="What was this for?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="form-input"
              />
            </div>
            <div className="form-field">
              <label className="form-label">Amount (CAD)</label>
              <div className="amount-input-wrap">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="amount-input"
                  onKeyDown={e => { if (e.key === 'Enter') addExpense(); }}
                />
              </div>
            </div>
          </div>
          <div className="form-actions">
            <button onClick={addExpense} className="btn btn-primary">Save Expense</button>
            <button onClick={() => setShowForm(false)} className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card filter-card">
        <div className="filter-row">
          <Filter size={16} className="filter-icon" />
          <div className="select-wrapper">
            <select
              value={filterMonth === 'all' ? 'all' : filterMonth}
              onChange={e => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="form-input filter-select"
            >
              <option value="all">All Months</option>
              {MONTHS.map(m => <option key={m.index} value={m.index}>{m.name}</option>)}
            </select>
          </div>
          <div className="select-wrapper">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="form-input filter-select"
            >
              <option value="all">All Categories</option>
              {CATEGORY_LABELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <span className="filter-total">{filtered.length} entries · {formatCAD(totalFiltered)}</span>
        </div>
      </div>

      <div className="expense-layout">
        <div className="card expense-list-card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <p>No expenses yet. Add one above — it'll automatically update the budget actuals.</p>
            </div>
          ) : (
            <div className="expense-list">
              {filtered.map(e => (
                <div key={e.id} className="expense-item">
                  <div className="expense-left">
                    <span className="expense-date">
                      {new Date(e.date + 'T12:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="expense-desc">{e.description}</span>
                    <span className="expense-cat">{e.category}</span>
                  </div>
                  <div className="expense-right">
                    <span className="expense-amount">{formatCAD(e.amount)}</span>
                    <button onClick={() => deleteExpense(e.id)} className="icon-btn icon-btn--cancel">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pieData.length > 0 && (
          <div className="card chart-card">
            <h3 className="card-title">Spending by Category</h3>
            <div className="chart-total">{formatCAD(totalFiltered)}</div>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCAD(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
