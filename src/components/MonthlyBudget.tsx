import { useState } from 'react';
import type { MonthData, BudgetItem } from '../types';
import { MONTHS, EXPENSE_TYPES, INCOME_TYPES, buildDefaultMonthlyData } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { Plus, Trash2, ChevronDown, RotateCcw } from 'lucide-react';

interface Props {
  monthlyData: MonthData[];
  setMonthlyData: (d: MonthData[] | ((prev: MonthData[]) => MonthData[])) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  Restaurant: '#FEE2E2', Gas: '#FEF3C7', Groceries: '#D1FAE5',
  Personal: '#F3E8FF', Rent: '#E0E7FF', Investments: '#DCFCE7',
  Salary: '#D1FAE5', Bonus: '#FEF9C3', Other: '#F3F4F6',
};
const CATEGORY_TEXT: Record<string, string> = {
  Restaurant: '#991B1B', Gas: '#92400E', Groceries: '#065F46',
  Personal: '#6B21A8', Rent: '#3730A3', Investments: '#14532D',
  Salary: '#065F46', Bonus: '#713F12', Other: '#374151',
};

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className="cat-badge" style={{ background: CATEGORY_COLORS[cat] ?? '#F3F4F6', color: CATEGORY_TEXT[cat] ?? '#374151' }}>
      {cat}
    </span>
  );
}

export default function MonthlyBudget({ monthlyData, setMonthlyData }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [addingItem, setAddingItem]       = useState(false);
  const [newKind, setNewKind]             = useState<'income' | 'expense'>('expense');
  const [newCategory, setNewCategory]     = useState<string>(EXPENSE_TYPES[0]);
  const [newName, setNewName]             = useState('');
  const [newAmount, setNewAmount]         = useState('');
  const [confirmClear, setConfirmClear]   = useState(false);
  const [editingIncome, setEditingIncome] = useState(false);
  const [incomeInput, setIncomeInput]     = useState('');

  const monthData      = monthlyData[selectedMonth];
  const monthlyIncome  = monthData?.monthlyIncome ?? 0;
  const incomeItems    = monthData?.items.filter(i => i.kind === 'income')  ?? [];
  const expenseItems   = monthData?.items.filter(i => i.kind === 'expense') ?? [];

  const totalActualIncome   = incomeItems.reduce((s, i)  => s + i.actual, 0);
  const totalActualExpenses = expenseItems.reduce((s, i) => s + i.actual, 0);
  const totalIncome         = monthlyIncome + totalActualIncome;
  const surplus             = totalIncome - totalActualExpenses;

  // ── Income editing ───────────────────────────────────────
  function startEditIncome() {
    setIncomeInput(monthlyIncome > 0 ? monthlyIncome.toString() : '');
    setEditingIncome(true);
  }
  function applyIncomeToMonth() {
    const v = parseFloat(incomeInput);
    if (!isNaN(v)) setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth ? { ...md, monthlyIncome: v } : md
    ));
    setEditingIncome(false);
  }
  function applyIncomeToRemaining() {
    const v = parseFloat(incomeInput);
    if (!isNaN(v)) setMonthlyData(prev => prev.map(md =>
      md.monthIndex >= selectedMonth ? { ...md, monthlyIncome: v } : md
    ));
    setEditingIncome(false);
  }
  function applyIncomeToAll() {
    const v = parseFloat(incomeInput);
    if (!isNaN(v)) setMonthlyData(prev => prev.map(md => ({ ...md, monthlyIncome: v })));
    setEditingIncome(false);
  }

  // ── Item CRUD ────────────────────────────────────────────
  function updateAmount(itemId: string, value: string) {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: md.items.map(i => i.id === itemId ? { ...i, actual: num } : i) }
        : md
    ));
  }

  function addItem() {
    if (!newAmount.trim()) return;
    const item: BudgetItem = {
      id: `${newKind}-${Date.now()}`,
      name: newName.trim() || newCategory,
      kind: newKind,
      category: newCategory,
      actual: parseFloat(newAmount) || 0,
    };
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth ? { ...md, items: [...md.items, item] } : md
    ));
    setNewName(''); setNewAmount(''); setAddingItem(false);
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
            <RotateCcw size={14} /><span>Clear All Data</span>
          </button>
        )}
      </div>

      {/* ── Per-month income ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Monthly Income</h2>
          <span className="card-hint">{MONTHS[selectedMonth]?.name}</span>
        </div>
        {editingIncome ? (
          <div className="income-edit-expanded">
            <div className="income-edit-row">
              <span className="input-prefix income-prefix">$</span>
              <input autoFocus type="number" value={incomeInput}
                onChange={e => setIncomeInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyIncomeToMonth(); if (e.key === 'Escape') setEditingIncome(false); }}
                className="income-edit-input" placeholder="0.00" />
            </div>
            <div className="income-apply-btns">
              <button onClick={applyIncomeToMonth}     className="btn btn-primary btn-sm">Save this month</button>
              <button onClick={applyIncomeToRemaining} className="btn btn-ghost btn-sm">Apply to remaining</button>
              <button onClick={applyIncomeToAll}       className="btn btn-ghost btn-sm">Apply to all months</button>
              <button onClick={() => setEditingIncome(false)} className="btn btn-ghost btn-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="income-edit-row">
            <span className="income-display">{formatCAD(monthlyIncome)}</span>
            <button onClick={startEditIncome} className="btn btn-ghost btn-sm">Edit</button>
          </div>
        )}
      </div>

      {/* ── Month tabs (desktop) ── */}
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

      {/* ── Month dropdown (mobile) ── */}
      <div className="month-dropdown-wrapper">
        <div className="select-wrapper">
          <select className="month-dropdown" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {MONTHS.map(m => <option key={m.index} value={m.index}>{m.name}</option>)}
          </select>
          <ChevronDown size={16} className="select-icon" />
        </div>
      </div>

      {/* ── Budget items ── */}
      <div className="card">
        <div className="budget-month-header" style={{ marginBottom: '0.75rem' }}>
          <span className="budget-month-title">{MONTHS[selectedMonth].name}</span>
        </div>

        <div className="budget-table-header budget-table-header--simple">
          <span className="col-item">Item</span>
          <span className="col-amount">Amount</span>
          <span className="col-actions"></span>
        </div>

        {/* Income items */}
        {incomeItems.length > 0 && (
          <div className="budget-group">
            <div className="budget-group-label"><span className="badge-income-header">+ Income</span></div>
            {incomeItems.map(item => (
              <div key={item.id} className="budget-row budget-row--simple">
                <div className="col-item budget-item-name">
                  <CategoryBadge cat={item.category} />
                  <span>{item.name !== item.category ? item.name : ''}</span>
                </div>
                <div className="col-amount">
                  <div className="amount-input-wrap">
                    <span className="input-prefix">$</span>
                    <input type="number" value={item.actual || ''} onChange={e => updateAmount(item.id, e.target.value)}
                      className="amount-input" placeholder="0" />
                  </div>
                </div>
                <div className="col-actions">
                  <button onClick={() => deleteItem(item.id)} className="icon-btn icon-btn--cancel"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expense items */}
        {expenseItems.length > 0 && (
          <div className="budget-group">
            <div className="budget-group-label"><span className="badge-expense-header">− Expenses</span></div>
            {expenseItems.map(item => (
              <div key={item.id} className="budget-row budget-row--simple">
                <div className="col-item budget-item-name">
                  <CategoryBadge cat={item.category} />
                  <span>{item.name !== item.category ? item.name : ''}</span>
                </div>
                <div className="col-amount">
                  <div className="amount-input-wrap">
                    <span className="input-prefix">$</span>
                    <input type="number" value={item.actual || ''} onChange={e => updateAmount(item.id, e.target.value)}
                      className="amount-input" placeholder="0" />
                  </div>
                </div>
                <div className="col-actions">
                  <button onClick={() => deleteItem(item.id)} className="icon-btn icon-btn--cancel"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {incomeItems.length === 0 && expenseItems.length === 0 && !addingItem && (
          <p className="empty-hint" style={{ paddingBottom: '0.5rem' }}>No items yet. Add an expense or income below.</p>
        )}

        {/* Add item form */}
        {addingItem ? (
          <div className="add-item-form">
            <div className="add-item-kind-toggle">
              <button className={`kind-btn ${newKind === 'expense' ? 'kind-btn--active kind-btn--expense' : ''}`}
                onClick={() => { setNewKind('expense'); setNewCategory(EXPENSE_TYPES[0]); }}>Expense</button>
              <button className={`kind-btn ${newKind === 'income' ? 'kind-btn--active kind-btn--income' : ''}`}
                onClick={() => { setNewKind('income'); setNewCategory(INCOME_TYPES[0]); }}>Income</button>
            </div>

            <div className="add-item-category-grid">
              {categoryOptions.map(cat => (
                <button key={cat}
                  className={`cat-chip ${newCategory === cat ? 'cat-chip--active' : ''}`}
                  style={newCategory === cat ? { background: CATEGORY_COLORS[cat], color: CATEGORY_TEXT[cat], borderColor: CATEGORY_TEXT[cat] } : {}}
                  onClick={() => setNewCategory(cat)}>{cat}</button>
              ))}
            </div>

            <div className="add-item-fields">
              <input type="text" placeholder="Name (optional)" value={newName}
                onChange={e => setNewName(e.target.value)} className="add-name-input" autoFocus />
              <div className="amount-input-wrap">
                <span className="input-prefix">$</span>
                <input type="number" placeholder="Amount" value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                  className="amount-input" />
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

        {/* ── Totals ── */}
        <div className="budget-totals">
          <div className="totals-row">
            <span className="totals-label">Total Income</span>
            <span className="totals-value pos">{formatCAD(totalIncome)}</span>
          </div>
          <div className="totals-row">
            <span className="totals-label">Total Expenses</span>
            <span className="totals-value">{formatCAD(totalActualExpenses)}</span>
          </div>
          <div className="totals-divider" />
          <div className="totals-row totals-row--surplus">
            <span className="totals-label">Surplus</span>
            <span className={`totals-surplus ${surplus >= 0 ? 'pos' : 'neg'}`}>{formatCAD(surplus)}</span>
          </div>
        </div>
      </div>

      {/* ── Category summary ── */}
      {(expenseItems.length > 0 || incomeItems.length > 0) && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Breakdown — {MONTHS[selectedMonth]?.name}</h2>
          </div>
          <div className="cat-breakdown">
            {expenseItems.length > 0 && (
              <div className="cat-breakdown-group">
                <div className="cat-breakdown-group-title">Expenses by Category</div>
                {EXPENSE_TYPES.map(cat => {
                  const total = expenseItems.filter(i => i.category === cat).reduce((s, i) => s + i.actual, 0);
                  if (total === 0) return null;
                  return (
                    <div key={cat} className="cat-breakdown-row">
                      <CategoryBadge cat={cat} />
                      <span className="cat-breakdown-val">{formatCAD(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {incomeItems.length > 0 && (
              <div className="cat-breakdown-group">
                <div className="cat-breakdown-group-title">Income by Category</div>
                {INCOME_TYPES.map(cat => {
                  const total = incomeItems.filter(i => i.category === cat).reduce((s, i) => s + i.actual, 0);
                  if (total === 0) return null;
                  return (
                    <div key={cat} className="cat-breakdown-row">
                      <CategoryBadge cat={cat} />
                      <span className="cat-breakdown-val pos">{formatCAD(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
