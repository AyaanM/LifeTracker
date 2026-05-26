import { useState } from 'react';
import type { MonthData, BudgetItem } from '../types';
import { MONTHS, EXPENSE_TYPES, INCOME_TYPES, buildDefaultMonthlyData } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { Plus, Trash2, ChevronDown, RotateCcw } from 'lucide-react';

interface Props {
  monthlyData: MonthData[];
  setMonthlyData: (d: MonthData[] | ((prev: MonthData[]) => MonthData[])) => void;
  monthlyIncome: number;
  setMonthlyIncome: (v: number | ((prev: number) => number)) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Restaurant: '#FEE2E2', Groceries: '#D1FAE5', Gas: '#FEF3C7',
  Education: '#DBEAFE', Entertainment: '#F3E8FF', Shopping: '#FCE7F3',
  Health: '#D1FAE5', Utilities: '#E0E7FF', Rent: '#FEE2E2',
  Transport: '#FEF9C3', Savings: '#DCFCE7', Subscription: '#F1F5F9',
  Other: '#F3F4F6', Salary: '#D1FAE5', Bonus: '#DCFCE7',
  Freelance: '#DBEAFE', Investment: '#E0E7FF',
};
const CATEGORY_TEXT: Record<string, string> = {
  Restaurant: '#991B1B', Groceries: '#065F46', Gas: '#92400E',
  Education: '#1E40AF', Entertainment: '#6B21A8', Shopping: '#9D174D',
  Health: '#065F46', Utilities: '#3730A3', Rent: '#991B1B',
  Transport: '#713F12', Savings: '#14532D', Subscription: '#475569',
  Other: '#374151', Salary: '#065F46', Bonus: '#14532D',
  Freelance: '#1E40AF', Investment: '#3730A3',
};

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className="cat-badge" style={{ background: CATEGORY_COLORS[cat] ?? '#F3F4F6', color: CATEGORY_TEXT[cat] ?? '#374151' }}>
      {cat}
    </span>
  );
}

export default function MonthlyBudget({ monthlyData, setMonthlyData, monthlyIncome, setMonthlyIncome }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [addingItem, setAddingItem] = useState(false);
  const [newKind, setNewKind] = useState<'income' | 'expense'>('expense');
  const [newCategory, setNewCategory] = useState<string>(EXPENSE_TYPES[0]);
  const [newName, setNewName] = useState('');
  const [newBudgeted, setNewBudgeted] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const monthData = monthlyData[selectedMonth];
  const incomeItems = monthData?.items.filter(i => i.kind === 'income') ?? [];
  const expenseItems = monthData?.items.filter(i => i.kind === 'expense') ?? [];

  const totalBudgetedIncome  = incomeItems.reduce((s, i) => s + i.budgeted, 0);
  const totalBudgetedExpenses = expenseItems.reduce((s, i) => s + i.budgeted, 0);
  const totalActualIncome    = incomeItems.reduce((s, i) => s + i.actual, 0);
  const totalActualExpenses  = expenseItems.reduce((s, i) => s + i.actual, 0);

  const totalIncome  = monthlyIncome + totalBudgetedIncome;
  const budgetedSurplus = totalIncome - totalBudgetedExpenses;
  const actualSurplus   = (monthlyIncome + totalActualIncome) - totalActualExpenses;

  function updateField(itemId: string, field: 'budgeted' | 'actual', value: string) {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: md.items.map(i => i.id === itemId ? { ...i, [field]: num } : i) }
        : md
    ));
  }

  function addItem() {
    if (!newName.trim()) return;
    const item: BudgetItem = {
      id: `${newKind}-${Date.now()}`,
      name: newName.trim(),
      kind: newKind,
      category: newCategory,
      budgeted: parseFloat(newBudgeted) || 0,
      actual: 0,
    };
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth ? { ...md, items: [...md.items, item] } : md
    ));
    setNewName(''); setNewBudgeted(''); setAddingItem(false);
  }

  function deleteItem(id: string) {
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: md.items.filter(i => i.id !== id) }
        : md
    ));
  }

  function clearAllData() {
    setMonthlyData(buildDefaultMonthlyData());
    setConfirmClear(false);
  }

  const categoryOptions = newKind === 'income' ? INCOME_TYPES : EXPENSE_TYPES;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Monthly Budget</h1>
          <p className="section-subtitle">{new Date().getFullYear()}</p>
        </div>
        {confirmClear ? (
          <div className="clear-confirm">
            <span className="clear-confirm-text">Clear all data?</span>
            <button onClick={clearAllData} className="btn btn-danger btn-sm">Yes, clear</button>
            <button onClick={() => setConfirmClear(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmClear(true)} className="btn btn-ghost btn-sm">
            <RotateCcw size={14} />
            <span>Clear All Data</span>
          </button>
        )}
      </div>

      {/* Global income */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Monthly Income</h2>
          <span className="card-hint">Same every month</span>
        </div>
        <div className="income-edit-row">
          <span className="input-prefix income-prefix">$</span>
          <input
            type="number"
            value={monthlyIncome || ''}
            onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) setMonthlyIncome(n); else if (e.target.value === '') setMonthlyIncome(0); }}
            className="income-edit-input"
            placeholder="0.00"
          />
          <span className="income-annual">= {formatCAD(monthlyIncome * 12)} / year</span>
        </div>
      </div>

      {/* Month selector */}
      <div className="card month-selector-card">
        <div className="month-tabs-scroll">
          {MONTHS.map(m => (
            <button key={m.index} onClick={() => setSelectedMonth(m.index)}
              className={`month-tab ${selectedMonth === m.index ? 'month-tab--active' : ''}`}>
              {m.short}
            </button>
          ))}
        </div>
      </div>

      <div className="month-dropdown-wrapper">
        <div className="select-wrapper">
          <select className="month-dropdown" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m.index} value={m.index}>{m.name}</option>)}
          </select>
          <ChevronDown size={16} className="select-icon" />
        </div>
      </div>

      {/* Budget table */}
      <div className="card">
        <div className="budget-month-header" style={{ marginBottom: '0.5rem' }}>
          <span className="budget-month-title">{MONTHS[selectedMonth].name}</span>
        </div>

        <div className="budget-table-header">
          <span className="col-category">Item</span>
          <span className="col-budgeted">Budgeted</span>
          <span className="col-actual">Actual</span>
          <span className="col-diff">Diff</span>
          <span className="col-actions"></span>
        </div>

        {/* Income section */}
        {incomeItems.length > 0 && (
          <div className="budget-group">
            <div className="budget-group-label"><span className="badge-income-header">+ Income</span></div>
            {incomeItems.map(item => {
              const diff = item.actual - item.budgeted;
              return (
                <div key={item.id} className="budget-row">
                  <div className="col-category budget-item-name">
                    <CategoryBadge cat={item.category} />
                    <span>{item.name}</span>
                  </div>
                  <div className="col-budgeted"><div className="amount-input-wrap"><span className="input-prefix">$</span><input type="number" value={item.budgeted || ''} onChange={e => updateField(item.id, 'budgeted', e.target.value)} className="amount-input" placeholder="0" /></div></div>
                  <div className="col-actual"><div className="amount-input-wrap"><span className="input-prefix">$</span><input type="number" value={item.actual || ''} onChange={e => updateField(item.id, 'actual', e.target.value)} className="amount-input" placeholder="0" /></div></div>
                  <div className="col-diff">{item.actual > 0 ? <span className={`diff-amount ${diff >= 0 ? 'diff-positive' : 'diff-negative'}`}>{diff >= 0 ? '+' : ''}{formatCAD(diff)}</span> : <span className="diff-pending">—</span>}</div>
                  <div className="col-actions"><button onClick={() => deleteItem(item.id)} className="icon-btn icon-btn--cancel"><Trash2 size={14} /></button></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expense section */}
        {expenseItems.length > 0 && (
          <div className="budget-group">
            <div className="budget-group-label"><span className="badge-expense-header">− Expenses</span></div>
            {expenseItems.map(item => {
              const diff = item.budgeted - item.actual;
              return (
                <div key={item.id} className="budget-row">
                  <div className="col-category budget-item-name">
                    <CategoryBadge cat={item.category} />
                    <span>{item.name}</span>
                  </div>
                  <div className="col-budgeted"><div className="amount-input-wrap"><span className="input-prefix">$</span><input type="number" value={item.budgeted || ''} onChange={e => updateField(item.id, 'budgeted', e.target.value)} className="amount-input" placeholder="0" /></div></div>
                  <div className="col-actual"><div className="amount-input-wrap"><span className="input-prefix">$</span><input type="number" value={item.actual || ''} onChange={e => updateField(item.id, 'actual', e.target.value)} className="amount-input" placeholder="0" /></div></div>
                  <div className="col-diff">{item.actual > 0 ? <span className={`diff-amount ${diff >= 0 ? 'diff-positive' : 'diff-negative'}`}>{diff >= 0 ? '+' : ''}{formatCAD(diff)}</span> : <span className="diff-pending">—</span>}</div>
                  <div className="col-actions"><button onClick={() => deleteItem(item.id)} className="icon-btn icon-btn--cancel"><Trash2 size={14} /></button></div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add item form */}
        {addingItem ? (
          <div className="add-item-form">
            <div className="add-item-kind-toggle">
              <button
                className={`kind-btn ${newKind === 'expense' ? 'kind-btn--active kind-btn--expense' : ''}`}
                onClick={() => { setNewKind('expense'); setNewCategory(EXPENSE_TYPES[0]); }}
              >Expense</button>
              <button
                className={`kind-btn ${newKind === 'income' ? 'kind-btn--active kind-btn--income' : ''}`}
                onClick={() => { setNewKind('income'); setNewCategory(INCOME_TYPES[0]); }}
              >Income</button>
            </div>

            <div className="add-item-category-grid">
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  className={`cat-chip ${newCategory === cat ? 'cat-chip--active' : ''}`}
                  style={newCategory === cat ? { background: CATEGORY_COLORS[cat], color: CATEGORY_TEXT[cat], borderColor: CATEGORY_TEXT[cat] } : {}}
                  onClick={() => setNewCategory(cat)}
                >{cat}</button>
              ))}
            </div>

            <div className="add-item-fields">
              <input
                type="text"
                placeholder="Name (optional)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="add-name-input"
                autoFocus
              />
              <div className="amount-input-wrap">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  placeholder="Budgeted"
                  value={newBudgeted}
                  onChange={e => setNewBudgeted(e.target.value)}
                  className="amount-input"
                  onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                />
              </div>
            </div>

            <div className="add-item-actions">
              <button onClick={addItem} className="btn btn-primary btn-sm">Add</button>
              <button onClick={() => setAddingItem(false)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="budget-add-trigger">
            <button onClick={() => setAddingItem(true)} className="btn-add-row">
              <Plus size={16} /><span>Add item</span>
            </button>
          </div>
        )}

        {/* Totals */}
        <div className="budget-totals">
          <div className="totals-row">
            <span className="totals-label">Income</span>
            <span className="totals-value pos">{formatCAD(totalIncome)}</span>
          </div>
          <div className="totals-row">
            <span className="totals-label">Expenses (budgeted)</span>
            <span className="totals-value">{formatCAD(totalBudgetedExpenses)}</span>
          </div>
          <div className="totals-row">
            <span className="totals-label">Expenses (actual)</span>
            <span className="totals-value">{formatCAD(totalActualExpenses)}</span>
          </div>
          <div className="totals-divider" />
          <div className="totals-row totals-row--surplus">
            <span className="totals-label">Budgeted Surplus</span>
            <span className={`totals-surplus ${budgetedSurplus >= 0 ? 'pos' : 'neg'}`}>{formatCAD(budgetedSurplus)}</span>
          </div>
          <div className="totals-row totals-row--surplus">
            <span className="totals-label">Actual Surplus</span>
            <span className={`totals-surplus ${actualSurplus >= 0 ? 'pos' : 'neg'}`}>
              {totalActualExpenses > 0 ? formatCAD(actualSurplus) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
