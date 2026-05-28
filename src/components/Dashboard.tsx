import { useState } from 'react';
import type { Account, SavingsGoal, MonthData } from '../types';
import { MONTHS } from '../constants/data';
import { formatCAD } from '../utils/formatters';
import { Pencil, Check, X, RefreshCw, Plus, Trash2 } from 'lucide-react';
import type { SyncStatus } from '../hooks/useCloudData';

interface Props {
  accounts: Account[];
  setAccounts: (v: Account[] | ((p: Account[]) => Account[])) => void;
  savingsGoals: SavingsGoal[];
  setSavingsGoals: (v: SavingsGoal[] | ((p: SavingsGoal[]) => SavingsGoal[])) => void;
  monthlyData: MonthData[];
  syncStatus: SyncStatus;
  onRefresh: () => void;
}

const CURRENT = new Date().getMonth();

export default function Dashboard({ accounts, setAccounts, savingsGoals, setSavingsGoals, monthlyData, syncStatus, onRefresh }: Props) {
  // Account editing
  const [editAccId, setEditAccId]   = useState<string | null>(null);
  const [editAccVal, setEditAccVal] = useState('');
  const [addingAcc, setAddingAcc]   = useState(false);
  const [newAccName, setNewAccName] = useState('');

  // Goal editing
  const [editGoalId, setEditGoalId]       = useState<string | null>(null);
  const [editGoalField, setEditGoalField] = useState<'current' | 'target'>('current');
  const [editGoalVal, setEditGoalVal]     = useState('');
  const [addingGoal, setAddingGoal]       = useState(false);
  const [newGoalName, setNewGoalName]     = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');

  const cur = monthlyData[CURRENT];
  const monthName = MONTHS[CURRENT]?.name ?? '';

  const income   = cur?.monthlyIncome ?? 0;
  const bonuses  = cur?.items.filter(i => i.kind === 'income').reduce((s, i) => s + i.actual, 0) ?? 0;
  const totalInc = income + bonuses;
  const dasond   = income * 0.125;
  const afterDas = totalInc - dasond;
  const expenses = cur?.items.filter(i => i.kind === 'expense').reduce((s, i) => s + i.actual, 0) ?? 0;
  const surplus  = afterDas - expenses;

  const annualInc = monthlyData.reduce((s, m) => s + (m.monthlyIncome ?? 0), 0);
  const annualExp = monthlyData.reduce((s, m) => s + m.items.filter(i => i.kind === 'expense').reduce((a, i) => a + i.actual, 0), 0);

  // ── Accounts ─────────────────────────────────────────────
  const startEditAcc = (id: string, amt: number) => { setEditAccId(id); setEditAccVal(amt.toString()); };
  const saveEditAcc  = () => {
    const v = parseFloat(editAccVal);
    if (!isNaN(v) && editAccId) setAccounts(p => p.map(a => a.id === editAccId ? { ...a, amount: v } : a));
    setEditAccId(null);
  };
  const addAccount = () => {
    if (!newAccName.trim()) return;
    setAccounts(p => [...p, { id: `acc-${Date.now()}`, name: newAccName.trim(), amount: 0 }]);
    setNewAccName(''); setAddingAcc(false);
  };

  // ── Goals ────────────────────────────────────────────────
  const startEditGoal = (id: string, field: 'current' | 'target', val: number) => {
    setEditGoalId(id); setEditGoalField(field); setEditGoalVal(val.toString());
  };
  const saveEditGoal = () => {
    const v = parseFloat(editGoalVal);
    if (!isNaN(v) && editGoalId)
      setSavingsGoals(p => p.map(g => g.id === editGoalId ? { ...g, [editGoalField]: v } : g));
    setEditGoalId(null);
  };
  const addGoal = () => {
    if (!newGoalName.trim()) return;
    setSavingsGoals(p => [...p, { id: `goal-${Date.now()}`, name: newGoalName.trim(), target: parseFloat(newGoalTarget) || 0, current: 0 }]);
    setNewGoalName(''); setNewGoalTarget(''); setAddingGoal(false);
  };

  return (
    <div className="section">
      <div className="section-header">
        <div><h1 className="section-title">Dashboard</h1></div>
      </div>

      {/* ── THIS MONTH hero ── */}
      <div className="hero-month-card">
        <div className="hero-month-title">{monthName}</div>
        <div className="hero-tiles">
          <div className="hero-tile hero-tile--income">
            <div className="hero-tile-label">Income</div>
            <div className="hero-tile-value">{formatCAD(totalInc)}</div>
          </div>
          <div className="hero-tile hero-tile--dasond">
            <div className="hero-tile-label">Dasond</div>
            <div className="hero-tile-value">{formatCAD(dasond)}</div>
            <div className="hero-tile-sub">12.5%</div>
          </div>
          <div className="hero-tile hero-tile--after">
            <div className="hero-tile-label">After Dasond</div>
            <div className="hero-tile-value">{formatCAD(afterDas)}</div>
          </div>
          <div className="hero-tile hero-tile--expenses">
            <div className="hero-tile-label">Expenses</div>
            <div className="hero-tile-value">{formatCAD(expenses)}</div>
          </div>
          <div className={`hero-tile ${surplus >= 0 ? 'hero-tile--surplus-pos' : 'hero-tile--surplus-neg'}`}>
            <div className="hero-tile-label">Surplus</div>
            <div className="hero-tile-value">{formatCAD(surplus)}</div>
          </div>
        </div>
      </div>

      {/* ── ANNUAL strip ── */}
      <div className="annual-strip">
        <div className="annual-strip-item">
          <span className="annual-strip-label">Annual Income</span>
          <span className="annual-strip-value">{formatCAD(annualInc)}</span>
        </div>
        <div className="annual-strip-divider" />
        <div className="annual-strip-item">
          <span className="annual-strip-label">Expenses This Year</span>
          <span className="annual-strip-value">{formatCAD(annualExp)}</span>
        </div>
        <div className="annual-strip-divider" />
        <div className="annual-strip-item">
          <span className="annual-strip-label">Net This Year</span>
          <span className={`annual-strip-value ${annualInc - annualExp >= 0 ? 'pos' : 'neg'}`}>{formatCAD(annualInc - annualExp)}</span>
        </div>
      </div>

      {/* ── SAVINGS GOALS ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Savings Goals</h2>
          {!addingGoal && <button onClick={() => setAddingGoal(true)} className="btn-add-small"><Plus size={14} /> Add Goal</button>}
        </div>

        {savingsGoals.length === 0 && !addingGoal && <p className="empty-hint">No savings goals yet.</p>}

        <div className="goals-list">
          {savingsGoals.map(goal => {
            const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
            return (
              <div key={goal.id} className="goal-row">
                <div className="goal-top-row">
                  <span className="goal-name">{goal.name}</span>
                  <span className="goal-pct">{pct.toFixed(0)}%</span>
                  <button onClick={() => setSavingsGoals(p => p.filter(g => g.id !== goal.id))} className="icon-btn icon-btn--cancel"><Trash2 size={13} /></button>
                </div>
                <div className="goal-progress-bar">
                  <div className="goal-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="goal-amounts-row">
                  <span className="goal-field-label">Saved</span>
                  {editGoalId === goal.id && editGoalField === 'current' ? (
                    <div className="account-edit">
                      <span className="edit-prefix">$</span>
                      <input autoFocus type="number" value={editGoalVal}
                        onChange={e => setEditGoalVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditGoal(); if (e.key === 'Escape') setEditGoalId(null); }}
                        className="edit-input" />
                      <button onClick={saveEditGoal} className="icon-btn icon-btn--save"><Check size={15} /></button>
                      <button onClick={() => setEditGoalId(null)} className="icon-btn icon-btn--cancel"><X size={15} /></button>
                    </div>
                  ) : (
                    <div className="account-value-row">
                      <span className="account-value">{formatCAD(goal.current)}</span>
                      <button onClick={() => startEditGoal(goal.id, 'current', goal.current)} className="icon-btn icon-btn--edit"><Pencil size={13} /></button>
                    </div>
                  )}
                  <span className="goal-sep">of</span>
                  <span className="goal-field-label">Goal</span>
                  {editGoalId === goal.id && editGoalField === 'target' ? (
                    <div className="account-edit">
                      <span className="edit-prefix">$</span>
                      <input autoFocus type="number" value={editGoalVal}
                        onChange={e => setEditGoalVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditGoal(); if (e.key === 'Escape') setEditGoalId(null); }}
                        className="edit-input" />
                      <button onClick={saveEditGoal} className="icon-btn icon-btn--save"><Check size={15} /></button>
                      <button onClick={() => setEditGoalId(null)} className="icon-btn icon-btn--cancel"><X size={15} /></button>
                    </div>
                  ) : (
                    <div className="account-value-row">
                      <span className="account-value goal-target-val">{formatCAD(goal.target)}</span>
                      <button onClick={() => startEditGoal(goal.id, 'target', goal.target)} className="icon-btn icon-btn--edit"><Pencil size={13} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {addingGoal && (
          <div className="add-account-form">
            <input autoFocus type="text" placeholder="Goal name"
              value={newGoalName} onChange={e => setNewGoalName(e.target.value)} className="add-name-input" />
            <div className="amount-input-wrap">
              <span className="input-prefix">$</span>
              <input type="number" placeholder="Target amount"
                value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addGoal(); }} className="amount-input" />
            </div>
            <button onClick={addGoal} className="btn btn-primary btn-sm">Add</button>
            <button onClick={() => setAddingGoal(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* ── ACCOUNT BALANCES ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Account Balances</h2>
          {!addingAcc && <button onClick={() => setAddingAcc(true)} className="btn-add-small"><Plus size={14} /> Add Account</button>}
        </div>
        <div className="accounts-grid">
          {accounts.map(acc => (
            <div key={acc.id} className="account-row">
              <span className="account-name">{acc.name}</span>
              {editAccId === acc.id ? (
                <div className="account-edit">
                  <span className="edit-prefix">$</span>
                  <input type="number" value={editAccVal} onChange={e => setEditAccVal(e.target.value)}
                    className="edit-input" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveEditAcc(); if (e.key === 'Escape') setEditAccId(null); }} />
                  <button onClick={saveEditAcc} className="icon-btn icon-btn--save"><Check size={16} /></button>
                  <button onClick={() => setEditAccId(null)} className="icon-btn icon-btn--cancel"><X size={16} /></button>
                </div>
              ) : (
                <div className="account-value-row">
                  <span className="account-value">{formatCAD(acc.amount)}</span>
                  <button onClick={() => startEditAcc(acc.id, acc.amount)} className="icon-btn icon-btn--edit"><Pencil size={14} /></button>
                  <button onClick={() => setAccounts(p => p.filter(a => a.id !== acc.id))} className="icon-btn icon-btn--cancel"><Trash2 size={13} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
        {addingAcc && (
          <div className="add-account-form">
            <input autoFocus type="text" placeholder="Account name"
              value={newAccName} onChange={e => setNewAccName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addAccount(); }} className="add-name-input" />
            <button onClick={addAccount} className="btn btn-primary btn-sm">Add</button>
            <button onClick={() => setAddingAcc(false)} className="btn btn-ghost btn-sm">Cancel</button>
          </div>
        )}
      </div>

      {/* ── DATA & SYNC ── */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Data &amp; Sync</h2>
          <span className={`sync-status-badge sync-status-badge--${syncStatus}`}>
            {syncStatus === 'saving' ? 'Saving…' : syncStatus === 'error' ? 'Sync Error' : syncStatus === 'loading' ? 'Loading…' : 'Synced'}
          </span>
        </div>
        <div className="sync-actions">
          <button onClick={onRefresh} className="btn btn-ghost"><RefreshCw size={16} /><span>Refresh</span></button>
        </div>
        {syncStatus === 'error' && (
          <p className="sync-error">Could not reach the cloud. Check your internet connection, or verify your Firebase Firestore rules allow reads and writes.</p>
        )}
      </div>
    </div>
  );
}
