import { useState } from 'react';
import { Cloud, ArrowRight, Loader2 } from 'lucide-react';
import { generateSyncCode, createNewSyncDoc, syncCodeExists } from '../hooks/useCloudData';
import { DEFAULT_BALANCES, buildDefaultMonthlyData } from '../constants/data';
import type { AccountBalances, MonthData, ExpenseEntry } from '../types';

interface Props {
  onComplete: (code: string) => void;
}

// Read any existing localStorage data so we migrate it to the cloud
function readLocalData() {
  function parse<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  return {
    balances: parse<AccountBalances>('tbf-balances', DEFAULT_BALANCES),
    monthlyData: parse<MonthData[]>('tbf-monthly', buildDefaultMonthlyData()),
    expenses: parse<ExpenseEntry[]>('tbf-expenses', []),
  };
}

export default function SyncSetup({ onComplete }: Props) {
  const [mode, setMode] = useState<'choose' | 'join'>('choose');
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleNewDevice() {
    setLoading(true);
    setError('');
    try {
      const code = generateSyncCode();
      const localData = readLocalData();
      await createNewSyncDoc(code, localData);
      localStorage.setItem('tbf-sync-code', code);
      onComplete(code);
    } catch (e) {
      console.error(e);
      setError('Could not connect to cloud. Check your internet connection and try again.');
      setLoading(false);
    }
  }

  async function handleJoin() {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    try {
      const exists = await syncCodeExists(trimmed);
      if (!exists) {
        setError('Code not found. Double-check the code from your other device.');
        setLoading(false);
        return;
      }
      localStorage.setItem('tbf-sync-code', trimmed);
      onComplete(trimmed);
    } catch (e) {
      console.error(e);
      setError('Could not connect to cloud. Check your internet connection and try again.');
      setLoading(false);
    }
  }

  return (
    <div className="sync-setup-overlay">
      <div className="sync-setup-card">
        <div className="sync-setup-icon">
          <Cloud size={32} />
        </div>
        <h1 className="sync-setup-title">The Blueprint</h1>
        <p className="sync-setup-sub">Set up cloud sync to access your data on any device.</p>

        {mode === 'choose' && (
          <div className="sync-setup-choices">
            <button
              className="sync-choice-btn sync-choice-btn--primary"
              onClick={handleNewDevice}
              disabled={loading}
            >
              {loading ? <Loader2 size={18} className="spin" /> : <Cloud size={18} />}
              <span>This is my first device</span>
              <span className="sync-choice-sub">Start fresh or migrate existing data</span>
            </button>
            <button
              className="sync-choice-btn"
              onClick={() => setMode('join')}
              disabled={loading}
            >
              <ArrowRight size={18} />
              <span>I have a sync code</span>
              <span className="sync-choice-sub">Connect to existing data</span>
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="sync-join-form">
            <p className="sync-join-hint">Enter the sync code shown on your other device (Dashboard → Data &amp; Sync).</p>
            <input
              className="sync-code-input"
              placeholder="XXXX-XXXX-XXXX"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              maxLength={14}
              autoFocus
              spellCheck={false}
            />
            <div className="sync-join-actions">
              <button className="btn btn-ghost" onClick={() => { setMode('choose'); setError(''); }} disabled={loading}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleJoin} disabled={loading || !codeInput.trim()}>
                {loading ? <Loader2 size={16} className="spin" /> : null}
                Connect
              </button>
            </div>
          </div>
        )}

        {error && <p className="sync-error">{error}</p>}
      </div>
    </div>
  );
}
