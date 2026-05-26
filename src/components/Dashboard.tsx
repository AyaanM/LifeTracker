import { useState, useRef } from 'react';
import type { AccountBalances, MonthData } from '../types';
import { MONTHS } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { Pencil, Check, X, Download, Upload, RefreshCw } from 'lucide-react';
import type { SyncStatus } from '../hooks/useCloudData';

interface Props {
  balances: AccountBalances;
  setBalances: (b: AccountBalances | ((prev: AccountBalances) => AccountBalances)) => void;
  monthlyData: MonthData[];
  monthlyIncome: number;
  syncStatus: SyncStatus;
  onRefresh: () => void;
}

const CURRENT_MONTH_INDEX = new Date().getMonth();

type EditableAccount = keyof AccountBalances;

const ACCOUNT_LABELS: Record<EditableAccount, string> = {
  debit:        'Chequing / Debit',
  expenses:     'Expenses',
  tfsa:         'TFSA',
  fhsa:         'FHSA',
  studentLoans: 'Student Loans',
};

export default function Dashboard({ balances, setBalances, monthlyData, monthlyIncome, syncStatus, onRefresh }: Props) {
  const [editing, setEditing] = useState<EditableAccount | null>(null);
  const [editValue, setEditValue] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMonthData = monthlyData[CURRENT_MONTH_INDEX];
  const currentMonthName = MONTHS[CURRENT_MONTH_INDEX]?.name ?? '';

  // Current month stats
  const currentExpenses = currentMonthData?.items
    .filter(i => i.kind === 'expense')
    .reduce((s, i) => s + i.actual, 0) ?? 0;
  const currentIncomeBonuses = currentMonthData?.items
    .filter(i => i.kind === 'income')
    .reduce((s, i) => s + i.actual, 0) ?? 0;
  const currentSurplus = monthlyIncome + currentIncomeBonuses - currentExpenses;

  // Annual stats
  const annualIncome = monthlyIncome * 12;
  const annualExpenses = monthlyData.reduce((total, md) => {
    return total + md.items.filter(i => i.kind === 'expense').reduce((s, i) => s + i.actual, 0);
  }, 0);
  const annualBudgetedExpenses = monthlyData.reduce((total, md) => {
    return total + md.items.filter(i => i.kind === 'expense').reduce((s, i) => s + i.budgeted, 0);
  }, 0);
  const netThisYear = annualIncome - annualExpenses;

  function startEdit(key: EditableAccount) {
    setEditing(key);
    setEditValue(balances[key].toString());
  }

  function saveEdit() {
    if (editing) {
      const val = parseFloat(editValue);
      if (!isNaN(val)) setBalances(prev => ({ ...prev, [editing]: val }));
      setEditing(null);
    }
  }

  function cancelEdit() { setEditing(null); setEditValue(''); }

  function exportData() {
    const payload = { exportedAt: new Date().toISOString(), balances, monthlyData };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blueprint-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(''); setImportSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.balances) { setImportError('Invalid file.'); return; }
        setBalances(data.balances);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch { setImportError('Could not parse file.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="section">
      <div className="section-header">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">{currentMonthName}</p>
        </div>
      </div>

      {/* Annual overview tiles */}
      <div className="annual-tiles">
        <div className="annual-tile annual-tile--income">
          <div className="annual-tile-label">Annual Income</div>
          <div className="annual-tile-value">{formatCAD(annualIncome)}</div>
          <div className="annual-tile-sub">{formatCAD(monthlyIncome)}/mo × 12</div>
        </div>
        <div className="annual-tile annual-tile--expenses">
          <div className="annual-tile-label">Expenses This Year</div>
          <div className="annual-tile-value">{formatCAD(annualExpenses)}</div>
          <div className="annual-tile-sub">of {formatCAD(annualBudgetedExpenses)} budgeted</div>
        </div>
        <div className={`annual-tile ${netThisYear >= 0 ? 'annual-tile--net-pos' : 'annual-tile--net-neg'}`}>
          <div className="annual-tile-label">Net This Year</div>
          <div className="annual-tile-value">{formatCAD(netThisYear)}</div>
          <div className="annual-tile-sub">income minus actual expenses</div>
        </div>
      </div>

      {/* This month summary */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">This Month — {currentMonthName}</h2>
        </div>
        <div className="month-summary-grid">
          <div className="month-summary-item">
            <span className="ms-label">Income</span>
            <span className="ms-value">{formatCAD(monthlyIncome + currentIncomeBonuses)}</span>
          </div>
          <div className="month-summary-item">
            <span className="ms-label">Expenses</span>
            <span className="ms-value">{formatCAD(currentExpenses)}</span>
          </div>
          <div className="month-summary-item">
            <span className="ms-label">Surplus</span>
            <span className={`ms-value ${currentSurplus >= 0 ? 'pos' : 'neg'}`}>{formatCAD(currentSurplus)}</span>
          </div>
        </div>
      </div>

      {/* Account balances */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Account Balances</h2>
          <span className="card-hint">Click pencil to edit</span>
        </div>
        <div className="accounts-grid">
          {(Object.keys(ACCOUNT_LABELS) as EditableAccount[]).map(key => (
            <div key={key} className="account-row">
              <span className="account-name">{ACCOUNT_LABELS[key]}</span>
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
                  <span className={`account-value ${key === 'studentLoans' && balances[key] > 0 ? 'neg' : ''}`}>
                    {key === 'studentLoans' && balances[key] > 0 ? '−' : ''}{formatCAD(balances[key])}
                  </span>
                  <button onClick={() => startEdit(key)} className="icon-btn icon-btn--edit"><Pencil size={14} /></button>
                </div>
              )}
            </div>
          ))}
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
        <div className="sync-actions">
          <button onClick={onRefresh} className="btn btn-ghost"><RefreshCw size={16} /><span>Refresh</span></button>
          <button onClick={exportData} className="btn btn-ghost"><Download size={16} /><span>Export</span></button>
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-ghost"><Upload size={16} /><span>Import</span></button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
        {importError && <p className="sync-error">{importError}</p>}
        {importSuccess && <p className="sync-success">Imported successfully.</p>}
      </div>
    </div>
  );
}
