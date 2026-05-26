import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Account, SavingsGoal, MonthData } from '../types';
import { DEFAULT_ACCOUNTS, buildDefaultMonthlyData, migrateMonthlyData, DATA_VERSION } from '../constants/data';

interface CloudPayload {
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  monthlyData: MonthData[];
  version: number;
  updatedAt: number;
}

const COLLECTION = 'blueprintUsers';
const SAVE_DEBOUNCE_MS = 800;

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'error';

export function useCloudData(syncCode: string) {
  const [accounts, setAccountsState]         = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [savingsGoals, setSavingsGoalsState]  = useState<SavingsGoal[]>([]);
  const [monthlyData, setMonthlyDataState]    = useState<MonthData[]>(buildDefaultMonthlyData());
  const [syncStatus, setSyncStatus]           = useState<SyncStatus>('loading');

  const latestRef = useRef<CloudPayload>({
    accounts: DEFAULT_ACCOUNTS,
    savingsGoals: [],
    monthlyData: buildDefaultMonthlyData(),
    version: DATA_VERSION,
    updatedAt: 0,
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToCloud = useCallback(async () => {
    setSyncStatus('saving');
    try {
      await setDoc(doc(db, COLLECTION, syncCode), latestRef.current);
      setSyncStatus('idle');
    } catch (e) {
      console.error('Cloud save failed', e);
      setSyncStatus('error');
    }
  }, [syncCode]);

  const scheduleSave = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(saveToCloud, SAVE_DEBOUNCE_MS);
  }, [saveToCloud]);

  const makeSet = <T>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof CloudPayload) =>
    useCallback((value: T | ((p: T) => T)) => {
      setter(prev => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        latestRef.current = { ...latestRef.current, [key]: next, updatedAt: Date.now() };
        scheduleSave();
        return next;
      });
    }, [scheduleSave]);

  const setAccounts     = makeSet<Account[]>(setAccountsState, 'accounts');
  const setSavingsGoals = makeSet<SavingsGoal[]>(setSavingsGoalsState, 'savingsGoals');
  const setMonthlyData  = makeSet<MonthData[]>(setMonthlyDataState, 'monthlyData');

  const loadFromCloud = useCallback(async () => {
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 6000));
    try {
      const snap = await Promise.race([getDoc(doc(db, COLLECTION, syncCode)), timeout]);
      if (snap && snap.exists()) {
        const data = snap.data() as CloudPayload & {
          balances?: Record<string, number>;
          monthlyIncome?: number; // old global field
        };

        // Migrate old global monthlyIncome → per-month
        const globalIncome = data.monthlyIncome ?? 0;
        const migrated = migrateMonthlyData(data.monthlyData ?? buildDefaultMonthlyData(), globalIncome);

        // Migrate old balances → accounts array
        let accs: Account[];
        if (data.accounts) {
          accs = data.accounts;
        } else if (data.balances) {
          accs = [
            { id: 'debit',        name: 'Chequing / Debit', amount: data.balances.debit ?? 0 },
            { id: 'expenses',     name: 'Expenses',          amount: data.balances.expenses ?? 0 },
            { id: 'tfsa',         name: 'TFSA',              amount: data.balances.tfsa ?? 0 },
            { id: 'fhsa',         name: 'FHSA',              amount: data.balances.fhsa ?? 0 },
            { id: 'studentLoans', name: 'Student Loans',     amount: data.balances.studentLoans ?? 0 },
          ];
        } else {
          accs = DEFAULT_ACCOUNTS;
        }

        const goals = data.savingsGoals ?? [];
        setAccountsState(accs);
        setSavingsGoalsState(goals);
        setMonthlyDataState(migrated);
        latestRef.current = {
          accounts: accs, savingsGoals: goals, monthlyData: migrated,
          version: DATA_VERSION, updatedAt: data.updatedAt ?? 0,
        };
      }
      setSyncStatus('idle');
    } catch (e) {
      console.error('Cloud load failed', e);
      setSyncStatus('idle');
    }
  }, [syncCode]);

  useEffect(() => {
    loadFromCloud();
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [loadFromCloud]);

  return {
    syncStatus,
    accounts, setAccounts,
    savingsGoals, setSavingsGoals,
    monthlyData, setMonthlyData,
    refresh: loadFromCloud,
  };
}

export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}
