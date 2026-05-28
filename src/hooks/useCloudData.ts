import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Account, SavingsGoal, MonthData, KanbanTask } from '../types';
import { DEFAULT_ACCOUNTS, buildDefaultMonthlyData, migrateMonthlyData, DATA_VERSION } from '../constants/data';

const DEFAULT_KANBAN_CATEGORIES = ['Work', 'Volunteer', 'Personal'];

interface CloudPayload {
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  monthlyData: MonthData[];
  kanbanTasks: KanbanTask[];
  kanbanCategories: string[];
  version: number;
  updatedAt: number;
}

const COLLECTION = 'blueprintUsers';
const SAVE_DEBOUNCE_MS = 800;

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'error';

export function useCloudData(syncCode: string) {
  const [accounts, setAccountsState]                    = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [savingsGoals, setSavingsGoalsState]             = useState<SavingsGoal[]>([]);
  const [monthlyData, setMonthlyDataState]               = useState<MonthData[]>(buildDefaultMonthlyData());
  const [kanbanTasks, setKanbanTasksState]               = useState<KanbanTask[]>([]);
  const [kanbanCategories, setKanbanCategoriesState]     = useState<string[]>(DEFAULT_KANBAN_CATEGORIES);
  const [syncStatus, setSyncStatus]                      = useState<SyncStatus>('loading');

  const latestRef     = useRef<CloudPayload>({
    accounts: DEFAULT_ACCOUNTS,
    savingsGoals: [],
    monthlyData: buildDefaultMonthlyData(),
    kanbanTasks: [],
    kanbanCategories: DEFAULT_KANBAN_CATEGORIES,
    version: DATA_VERSION,
    updatedAt: 0,
  });
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard: never save before the initial cloud load finishes (avoids overwriting real data with defaults)
  const hasLoaded     = useRef(false);

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
    if (!hasLoaded.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(saveToCloud, SAVE_DEBOUNCE_MS);
  }, [saveToCloud]);

  // Each setter is a proper top-level useCallback (fixes the old hook-inside-function violation)
  const setAccounts = useCallback((value: Account[] | ((p: Account[]) => Account[])) => {
    setAccountsState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, accounts: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const setSavingsGoals = useCallback((value: SavingsGoal[] | ((p: SavingsGoal[]) => SavingsGoal[])) => {
    setSavingsGoalsState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, savingsGoals: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const setMonthlyData = useCallback((value: MonthData[] | ((p: MonthData[]) => MonthData[])) => {
    setMonthlyDataState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, monthlyData: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const setKanbanTasks = useCallback((value: KanbanTask[] | ((p: KanbanTask[]) => KanbanTask[])) => {
    setKanbanTasksState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, kanbanTasks: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const setKanbanCategories = useCallback((value: string[] | ((p: string[]) => string[])) => {
    setKanbanCategoriesState(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      latestRef.current = { ...latestRef.current, kanbanCategories: next, updatedAt: Date.now() };
      scheduleSave();
      return next;
    });
  }, [scheduleSave]);

  const loadFromCloud = useCallback(async () => {
    hasLoaded.current = false;
    setSyncStatus('loading');
    const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 8000));
    try {
      const snap = await Promise.race([getDoc(doc(db, COLLECTION, syncCode)), timeout]);
      if (snap && snap.exists()) {
        const data = snap.data() as CloudPayload & {
          balances?: Record<string, number>;
          monthlyIncome?: number;
        };

        const globalIncome = data.monthlyIncome ?? 0;
        const migrated = migrateMonthlyData(data.monthlyData ?? buildDefaultMonthlyData(), globalIncome);

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

        const goals   = data.savingsGoals ?? [];
        const ktasks  = data.kanbanTasks ?? [];
        const kcats   = data.kanbanCategories ?? DEFAULT_KANBAN_CATEGORIES;
        setAccountsState(accs);
        setSavingsGoalsState(goals);
        setMonthlyDataState(migrated);
        setKanbanTasksState(ktasks);
        setKanbanCategoriesState(kcats);
        latestRef.current = {
          accounts: accs, savingsGoals: goals, monthlyData: migrated,
          kanbanTasks: ktasks, kanbanCategories: kcats,
          version: DATA_VERSION, updatedAt: data.updatedAt ?? 0,
        };
      }
    } catch (e) {
      console.error('Cloud load failed', e);
    } finally {
      hasLoaded.current = true;
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
    kanbanTasks, setKanbanTasks,
    kanbanCategories, setKanbanCategories,
    refresh: loadFromCloud,
  };
}

export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}
