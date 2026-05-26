import { useState } from 'react';
import type { MonthData, BudgetItem, ExpenseEntry } from '../types';
import { MONTHS, getNetIncome, EXPENSE_CATEGORIES, LOG_TRACKED_IDS, getMonthIndexFromDate } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { Plus, Trash2, ChevronDown, Receipt } from 'lucide-react';

interface Props {
  monthlyData: MonthData[];
  setMonthlyData: (d: MonthData[] | ((prev: MonthData[]) => MonthData[])) => void;
  expenses: ExpenseEntry[];
}

// Sum all expense-log entries for a given month and budget item ID
function computeLogActual(expenses: ExpenseEntry[], monthIndex: number, budgetItemId: string): number {
  return expenses
    .filter(e => {
      const mi = getMonthIndexFromDate(e.date);
      if (mi !== monthIndex) return false;
      const cat = EXPENSE_CATEGORIES.find(c => c.label === e.category);
      return cat?.budgetItemId === budgetItemId;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export default function MonthlyBudget({ monthlyData, setMonthlyData, expenses }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [newItemName, setNewItemName] = useState('');
  const [newItemBudget, setNewItemBudget] = useState('');
  const [addingItem, setAddingItem] = useState(false);

  const monthData = monthlyData[selectedMonth];
  const netIncome = getNetIncome(selectedMonth);

  // Resolve actual for each item: log-tracked → computed, others → stored manual value
  function resolveActual(item: BudgetItem): number {
    if (LOG_TRACKED_IDS.has(item.id)) {
      return computeLogActual(expenses, selectedMonth, item.id);
    }
    return item.actual || 0;
  }

  const totalBudgeted = monthData?.items.reduce((s, i) => s + i.budgeted, 0) ?? 0;
  const totalActual   = monthData?.items.reduce((s, i) => s + resolveActual(i), 0) ?? 0;
  const budgetedSurplus = netIncome - totalBudgeted;
  const actualSurplus   = netIncome - totalActual;

  function updateActual(itemId: string, value: string) {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: md.items.map(i => i.id === itemId ? { ...i, actual: num } : i) }
        : md
    ));
  }

  function updateBudgeted(itemId: string, value: string) {
    const num = value === '' ? 0 : parseFloat(value);
    if (isNaN(num)) return;
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: md.items.map(i => i.id === itemId ? { ...i, budgeted: num } : i) }
        : md
    ));
  }

  function addCustomItem() {
    if (!newItemName.trim()) return;
    const budget = parseFloat(newItemBudget) || 0;
    const newItem: BudgetItem = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      budgeted: budget,
      actual: 0,
      category: 'custom',
      locked: false,
    };
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: [...md.items, newItem] }
        : md
    ));
    setNewItemName('');
    setNewItemBudget('');
    setAddingItem(false);
  }

  function deleteItem(itemId: string) {
    setMonthlyData(prev => prev.map(md =>
      md.monthIndex === selectedMonth
        ? { ...md, items: md.items.filter(i => i.id !== itemId) }
        : md
    ));
  }

  function getCategoryLabel(cat: BudgetItem['category']) {
    switch (cat) {
      case 'fixed':    return 'Fixed';
      case 'savings':  return 'Savings / Investment';
      case 'one-time': return 'One-Time';
      case 'custom':   return 'Custom';
    }
  }

  function getCategoryClass(cat: BudgetItem['category']) {
    switch (cat) {
      case 'fixed':    return 'badge-fixed';
      case 'savings':  return 'badge-savings';
      case 'one-time': return 'badge-onetime';
      case 'custom':   return 'badge-custom';
    }
  }

  const groups: BudgetItem['category'][] = ['fixed', 'savings', 'one-time', 'custom'];

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Monthly Budget</h1>
          <p className="section-subtitle">Track budgeted vs actual spending month by month</p>
        </div>
      </div>

      {/* Month selector tabs */}
      <div className="card month-selector-card">
        <div className="month-tabs-scroll">
          {MONTHS.map(m => (
            <button
              key={m.index}
              onClick={() => setSelectedMonth(m.index)}
              className={`month-tab ${selectedMonth === m.index ? 'month-tab--active' : ''}`}
            >
              {m.short}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile dropdown */}
      <div className="month-dropdown-wrapper">
        <div className="select-wrapper">
          <select
            className="month-dropdown"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTHS.map(m => (
              <option key={m.index} value={m.index}>Month {m.index + 1} — {m.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-icon" />
        </div>
      </div>

      {/* Month header */}
      <div className="budget-month-header">
        <div className="budget-month-title">
          <span>Month {selectedMonth + 1}</span>
          <span className="dot">·</span>
          <span>{MONTHS[selectedMonth].name}</span>
        </div>
        <div className="budget-income-badge">Net Income: {formatCAD(netIncome)}</div>
      </div>

      {/* Budget table */}
      <div className="card">
        <div className="budget-table-header">
          <span className="col-category">Category</span>
          <span className="col-budgeted">Budgeted</span>
          <span className="col-actual">Actual</span>
          <span className="col-diff">Difference</span>
          <span className="col-actions"></span>
        </div>

        {groups.map(group => {
          const groupItems = monthData?.items.filter(i => i.category === group) ?? [];
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="budget-group">
              <div className="budget-group-label">
                <span className={`badge ${getCategoryClass(group)}`}>{getCategoryLabel(group)}</span>
              </div>
              {groupItems.map(item => {
                const actual = resolveActual(item);
                const isLogTracked = LOG_TRACKED_IDS.has(item.id);
                const diff = item.budgeted - actual;
                const hasActual = actual > 0;
                return (
                  <div key={item.id} className="budget-row">
                    <span className="col-category budget-item-name">{item.name}</span>

                    {/* Budgeted — always editable */}
                    <div className="col-budgeted">
                      <div className="amount-input-wrap">
                        <span className="input-prefix">$</span>
                        <input
                          type="number"
                          value={item.budgeted || ''}
                          onChange={e => updateBudgeted(item.id, e.target.value)}
                          className="amount-input"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Actual — computed from log for tracked items, manual for others */}
                    <div className="col-actual">
                      {isLogTracked ? (
                        <div className="log-actual">
                          <span className="log-actual-value">{formatCAD(actual)}</span>
                          <span className="log-actual-badge" title="Auto-totalled from Expense Log">
                            <Receipt size={11} />
                            from log
                          </span>
                        </div>
                      ) : (
                        <div className="amount-input-wrap">
                          <span className="input-prefix">$</span>
                          <input
                            type="number"
                            value={item.actual || ''}
                            onChange={e => updateActual(item.id, e.target.value)}
                            className="amount-input"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>

                    <div className="col-diff">
                      {hasActual ? (
                        <span className={`diff-amount ${diff >= 0 ? 'diff-positive' : 'diff-negative'}`}>
                          {diff >= 0 ? '+' : ''}{formatCAD(diff)}
                        </span>
                      ) : (
                        <span className="diff-pending">—</span>
                      )}
                    </div>
                    <div className="col-actions">
                      {!item.locked && (
                        <button onClick={() => deleteItem(item.id)} className="icon-btn icon-btn--cancel">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Add custom row */}
        {addingItem ? (
          <div className="budget-add-row">
            <input
              type="text"
              placeholder="Expense name"
              value={newItemName}
              onChange={e => setNewItemName(e.target.value)}
              className="add-name-input"
              autoFocus
            />
            <div className="amount-input-wrap">
              <span className="input-prefix">$</span>
              <input
                type="number"
                placeholder="Amount"
                value={newItemBudget}
                onChange={e => setNewItemBudget(e.target.value)}
                className="amount-input"
                onKeyDown={e => { if (e.key === 'Enter') addCustomItem(); }}
              />
            </div>
            <button onClick={addCustomItem} className="btn btn-primary btn-sm">Add</button>
            <button onClick={() => setAddingItem(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        ) : (
          <div className="budget-add-trigger">
            <button onClick={() => setAddingItem(true)} className="btn-add-row">
              <Plus size={16} />
              <span>Add expense</span>
            </button>
          </div>
        )}

        {/* Totals */}
        <div className="budget-totals">
          <div className="totals-row">
            <span className="totals-label">Total Budgeted Out</span>
            <span className="totals-value">{formatCAD(totalBudgeted)}</span>
          </div>
          <div className="totals-row">
            <span className="totals-label">Total Actual Out</span>
            <span className="totals-value">{formatCAD(totalActual)}</span>
          </div>
          <div className="totals-divider" />
          <div className="totals-row totals-row--surplus">
            <span className="totals-label">Budgeted Surplus</span>
            <span className={`totals-surplus ${budgetedSurplus >= 0 ? 'pos' : 'neg'}`}>
              {formatCAD(budgetedSurplus)}
            </span>
          </div>
          <div className="totals-row totals-row--surplus">
            <span className="totals-label">Actual Surplus</span>
            <span className={`totals-surplus ${actualSurplus >= 0 ? 'pos' : 'neg'}`}>
              {totalActual > 0 ? formatCAD(actualSurplus) : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
