import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AccountBalances, MonthData, ExpenseEntry } from '../types';
import { DEFAULT_BALANCES, buildDefaultMonthlyData, migrateMonthlyData, DATA_VERSION } from '../constants/data';

interface CloudPayload {
  balances: AccountBalances;
  monthlyData: MonthData[];
  expenses: ExpenseEntry[];
  version: number;
  updatedAt: number;
}

const COLLECTION = 'blueprintUsers';
const SAVE_DEBOUNCE_MS = 800;

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'error';

export function useCloudData(syncCode: string) {
  const [balances, setBalancesState] = useState<AccountBalances>(DEFAULT_BALANCES);
  const [monthlyData, setMonthlyDataState] = useState<MonthData[]>(buildDefaultMonthlyData());
  const [expenses, setExpensesState] = useState<ExpenseEntry[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');

  const latestRef = useRef<CloudPayload>({
    balances,
    monthlyData,
    expenses,
    version: DATA_VERSION,
    updatedAt: 0,
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToCloud = useCallback(async () => {
    setSyncStatus('saving');
    try {
      const docRef = doc(db, COLLECTION, syncCode);
      await setDoc(docRef, latestRef.current);
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

  const setBalances = useCallback((value: AccountBalances | ((prev: AccountBalances) => AccountBalances)) => {
    setBalancesState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, balances: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const setMonthlyData = useCallback((value: MonthData[] | ((prev: MonthData[]) => MonthData[])) => {
    setMonthlyDataState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, monthlyData: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const setExpenses = useCallback((value: ExpenseEntry[] | ((prev: ExpenseEntry[]) => ExpenseEntry[])) => {
    setExpensesState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, expenses: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const loadFromCloud = useCallback(async () => {
    try {
      const docRef = doc(db, COLLECTION, syncCode);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data() as CloudPayload;
        const migrated = migrateMonthlyData(data.monthlyData ?? buildDefaultMonthlyData());
        const b = data.balances ?? DEFAULT_BALANCES;
        const e = data.expenses ?? [];
        setBalancesState(b);
        setMonthlyDataState(migrated);
        setExpensesState(e);
        latestRef.current = {
          balances: b,
          monthlyData: migrated,
          expenses: e,
          version: DATA_VERSION,
          updatedAt: data.updatedAt ?? 0,
        };
      }
      setSyncStatus('idle');
    } catch (e) {
      console.error('Cloud load failed', e);
      setSyncStatus('error');
    }
  }, [syncCode]);

  useEffect(() => {
    loadFromCloud();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [loadFromCloud]);

  return {
    syncStatus,
    balances,
    setBalances,
    monthlyData,
    setMonthlyData,
    expenses,
    setExpenses,
    refresh: loadFromCloud,
  };
}

export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}

export async function createNewSyncDoc(syncCode: string, payload: Omit<CloudPayload, 'version' | 'updatedAt'>) {
  const docRef = doc(db, COLLECTION, syncCode);
  await setDoc(docRef, {
    ...payload,
    version: DATA_VERSION,
    updatedAt: Date.now(),
  });
}

export async function syncCodeExists(syncCode: string): Promise<boolean> {
  const snap = await getDoc(doc(db, COLLECTION, syncCode));
  return snap.exists();
}
