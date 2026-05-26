import { useState, useRef } from 'react';
import type { AccountBalances, MonthData, ExpenseEntry } from '../types';
import { MONTHS, SALARY_PHASES, getNetIncome } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { Pencil, Check, X, AlertCircle, TrendingUp, Download, Upload, Copy, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '../hooks/useCloudData';

interface Props {
  balances: AccountBalances;
  setBalances: (b: AccountBalances | ((prev: AccountBalances) => AccountBalances)) => void;
  monthlyData: MonthData[];
  setMonthlyData: (d: MonthData[] | ((prev: MonthData[]) => MonthData[])) => void;
  expenses: ExpenseEntry[];
  setExpenses: (e: ExpenseEntry[] | ((prev: ExpenseEntry[]) => ExpenseEntry[])) => void;
  syncCode: string;
  syncStatus: SyncStatus;
  onRefresh: () => void;
}

const CURRENT_MONTH_INDEX = 0;

type EditableAccount = keyof AccountBalances;

export default function Dashboard({ balances, setBalances, monthlyData, setMonthlyData, expenses, setExpenses, syncCode, syncStatus, onRefresh }: Props) {
  const [editing, setEditing] = useState<EditableAccount | null>(null);
  const [editValue, setEditValue] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function copySyncCode() {
    navigator.clipboard.writeText(syncCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  const totalNetWorth = Object.values(balances).reduce((a, b) => a + b, 0);
  const netIncome = getNetIncome(CURRENT_MONTH_INDEX);

  const currentMonthData = monthlyData[CURRENT_MONTH_INDEX];
  const totalActualExpenses = currentMonthData?.items.reduce((s, i) => s + (i.actual || 0), 0) ?? 0;
  const remainingBudget = netIncome - totalActualExpenses;

  let cumulativeSavings = 0;
  for (let i = 0; i < MONTHS.length; i++) {
    const md = monthlyData[i];
    const income = getNetIncome(i);
    const actual = md?.items.reduce((s, item) => s + (item.actual || 0), 0) ?? 0;
    if (actual > 0) cumulativeSavings += income - actual;
  }

  let projectedSavings = 0;
  for (let i = 0; i < MONTHS.length; i++) {
    const md = monthlyData[i];
    const income = getNetIncome(i);
    const budgeted = md?.items.reduce((s, item) => s + item.budgeted, 0) ?? 0;
    projectedSavings += income - budgeted;
  }
  const projectedNetWorth = totalNetWorth + projectedSavings;

  // Pending = investment contributions not yet entered as actual (due 18th)
  const pendingItems = currentMonthData?.items.filter(item =>
    (item.id === 'rrsp' || item.id === 'tfsa') && item.actual === 0
  ) ?? [];

  function startEdit(key: EditableAccount) {
    setEditing(key);
    setEditValue(balances[key].toString());
  }

  function saveEdit() {
    if (editing) {
      const val = parseFloat(editValue);
      if (!isNaN(val) && val >= 0) {
        setBalances(prev => ({ ...prev, [editing]: val }));
      }
      setEditing(null);
    }
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  // Export all app data as JSON download
  function exportData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      balances,
      monthlyData,
      expenses,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-finance-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import from JSON file
  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError('');
    setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.balances || !data.monthlyData || !data.expenses) {
          setImportError('Invalid file — missing required fields.');
          return;
        }
        setBalances(data.balances);
        setMonthlyData(data.monthlyData);
        setExpenses(data.expenses);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch {
        setImportError('Could not parse file. Make sure it\'s a valid Blueprint export.');
      }
    };
    reader.readAsText(file);
    // reset so same file can be re-imported
    e.target.value = '';
  }

  const ACCOUNT_LABELS: Record<EditableAccount, string> = {
    debit: 'Chequing / Debit',
    savings: 'Savings',
    tfsa: 'TFSA',
    rrsp: 'RRSP',
    wealthsimple: 'Wealthsimple',
  };

  const currentPhase = SALARY_PHASES.find(p => p.months.includes(CURRENT_MONTH_INDEX));
  const currentMonthName = MONTHS[CURRENT_MONTH_INDEX].name;

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Month 1 of 16 · {currentMonthName} · ${currentPhase?.rate}/hr</p>
        </div>
      </div>

      {pendingItems.length > 0 && (
        <div className="pending-banner">
          <div className="pending-banner-icon"><AlertCircle size={18} /></div>
          <div className="pending-banner-content">
            <span className="pending-banner-title">Pending this month (due 18th)</span>
            <div className="pending-list">
              {currentMonthData?.items.filter(i => (i.id === 'rrsp' || i.id === 'tfsa') && i.actual === 0).map(i => (
                <span key={i.id} className="pending-tag">{i.name} {formatCAD(i.budgeted)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-card--primary">
          <div className="stat-label">Monthly Net Income</div>
          <div className="stat-value">{formatCAD(netIncome)}</div>
          <div className="stat-sub">Phase {SALARY_PHASES.findIndex(p => p.months.includes(CURRENT_MONTH_INDEX)) + 1}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remaining Budget</div>
          <div className={`stat-value ${remainingBudget < 0 ? 'stat-value--negative' : 'stat-value--positive'}`}>
            {formatCAD(remainingBudget)}
          </div>
          <div className="stat-sub">this month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Cumulative Savings</div>
          <div className="stat-value">{formatCAD(cumulativeSavings)}</div>
          <div className="stat-sub">to date</div>
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

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Account Balances</h2>
          <span className="card-hint">Click pencil to edit</span>
        </div>
        <div className="accounts-grid">
          {(Object.keys(ACCOUNT_LABELS) as EditableAccount[]).map(key => (
            <div key={key} className="account-row">
              <div className="account-info">
                <span className="account-name">{ACCOUNT_LABELS[key]}</span>
                {key === 'wealthsimple' && <span className="volatile-badge">volatile</span>}
              </div>
              {editing === key ? (
                <div className="account-edit">
                  <span className="edit-prefix">$</span>
                  <input
                    type="number"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="edit-input"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                  />
                  <button onClick={saveEdit} className="icon-btn icon-btn--save"><Check size={16} /></button>
                  <button onClick={cancelEdit} className="icon-btn icon-btn--cancel"><X size={16} /></button>
                </div>
              ) : (
                <div className="account-value-row">
                  <span className="account-value">{formatCAD(balances[key])}</span>
                  <button onClick={() => startEdit(key)} className="icon-btn icon-btn--edit">
                    <Pencil size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="total-row">
          <span className="total-label">Total Net Worth</span>
          <span className="total-value">{formatCAD(totalNetWorth)}</span>
        </div>
        <p className="disclaimer">* Wealthsimple balance is market-linked and may fluctuate. Update manually as needed.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">This Month at a Glance — {currentMonthName}</h2>
        </div>
        <div className="month-summary-grid">
          <div className="month-summary-item">
            <span className="ms-label">Net Income</span>
            <span className="ms-value">{formatCAD(netIncome)}</span>
          </div>
          <div className="month-summary-item">
            <span className="ms-label">Budgeted Out</span>
            <span className="ms-value">
              {formatCAD(currentMonthData?.items.reduce((s, i) => s + i.budgeted, 0) ?? 0)}
            </span>
          </div>
          <div className="month-summary-item">
            <span className="ms-label">Actual Out</span>
            <span className="ms-value">{formatCAD(totalActualExpenses)}</span>
          </div>
          <div className="month-summary-item">
            <span className="ms-label">Budgeted Surplus</span>
            <span className={`ms-value ${(netIncome - (currentMonthData?.items.reduce((s, i) => s + i.budgeted, 0) ?? 0)) < 0 ? 'neg' : 'pos'}`}>
              {formatCAD(netIncome - (currentMonthData?.items.reduce((s, i) => s + i.budgeted, 0) ?? 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Data & Sync */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Data &amp; Sync</h2>
          <span className={`sync-status-badge sync-status-badge--${syncStatus}`}>
            {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'error' ? 'Offline' : 'Synced'}
          </span>
        </div>
        <p className="sync-description">
          Your data is stored in the cloud. Open this app on any device and enter your sync code to access the same data.
        </p>

        <div className="sync-code-block">
          <span className="sync-code-label">Your sync code</span>
          <div className="sync-code-row">
            <span className="sync-code-value">{syncCode}</span>
            <button className="btn btn-ghost btn-sm sync-copy-btn" onClick={copySyncCode}>
              <Copy size={14} />
              <span>{codeCopied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <span className="sync-code-hint">Enter this on another device when prompted at first launch.</span>
        </div>

        <div className="sync-actions">
          <button onClick={onRefresh} className="btn btn-ghost">
            <RefreshCw size={16} />
            <span>Pull latest</span>
          </button>
          <button onClick={exportData} className="btn btn-ghost">
            <Download size={16} />
            <span>Export JSON</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost">
            <Upload size={16} />
            <span>Import JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>
        {importError && <p className="sync-error">{importError}</p>}
        {importSuccess && <p className="sync-success">Data imported successfully.</p>}
      </div>
    </div>
  );
}
