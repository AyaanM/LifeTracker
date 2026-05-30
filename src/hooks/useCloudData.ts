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

const COLLECTION     = 'LifeTrackerUsers';
const SAVE_DEBOUNCE  = 300; // ms — short enough to feel instant

export type SyncStatus = 'loading' | 'idle' | 'saving' | 'error';

export function useCloudData(syncCode: string) {
  const [accounts,          setAccountsState]          = useState<Account[]>(DEFAULT_ACCOUNTS);
  const [savingsGoals,      setSavingsGoalsState]       = useState<SavingsGoal[]>([]);
  const [monthlyData,       setMonthlyDataState]        = useState<MonthData[]>(buildDefaultMonthlyData());
  const [kanbanTasks,       setKanbanTasksState]        = useState<KanbanTask[]>([]);
  const [kanbanCategories,  setKanbanCategoriesState]   = useState<string[]>(DEFAULT_KANBAN_CATEGORIES);
  const [syncStatus,        setSyncStatus]              = useState<SyncStatus>('loading');

  // Single source of truth fed to Firestore on every save
  const latestRef = useRef<CloudPayload>({
    accounts: DEFAULT_ACCOUNTS,
    savingsGoals: [],
    monthlyData: buildDefaultMonthlyData(),
    kanbanTasks: [],
    kanbanCategories: DEFAULT_KANBAN_CATEGORIES,
    version: DATA_VERSION,
    updatedAt: 0,
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Blocks saves until the first cloud load completes (prevents overwriting real data with defaults)
  const hasLoaded = useRef(false);

  const saveToCloud = useCallback(async () => {
    setSyncStatus('saving');
    try {
      await setDoc(doc(db, COLLECTION, syncCode), latestRef.current);
      setSyncStatus('idle');
    } catch (e: unknown) {
      console.error('Cloud save failed:', e);
      setSyncStatus('error');
    }
  }, [syncCode]);

  const scheduleSave = useCallback(() => {
    if (!hasLoaded.current) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(saveToCloud, SAVE_DEBOUNCE);
  }, [saveToCloud]);

  // ─────────────────────────────────────────────────────────
  // KEY FIX: every setter computes `next` from latestRef (not
  // from the React state updater callback).  scheduleSave() is
  // then called OUTSIDE any state-setter function.
  //
  // Previously scheduleSave() was called *inside* the setState
  // callback passed to setAccountsState/etc.  React's concurrent
  // renderer can invoke those callbacks more than once (for
  // speculative renders) or at unpredictable times — meaning the
  // debounce timer was being set/reset at the wrong moment and
  // could fire with stale latestRef data before the commit.
  // ─────────────────────────────────────────────────────────

  const setAccounts = useCallback((value: Account[] | ((p: Account[]) => Account[])) => {
    const next = typeof value === 'function' ? value(latestRef.current.accounts) : value;
    latestRef.current = { ...latestRef.current, accounts: next, updatedAt: Date.now() };
    setAccountsState(next);
    scheduleSave();
  }, [scheduleSave]);

  const setSavingsGoals = useCallback((value: SavingsGoal[] | ((p: SavingsGoal[]) => SavingsGoal[])) => {
    const next = typeof value === 'function' ? value(latestRef.current.savingsGoals) : value;
    latestRef.current = { ...latestRef.current, savingsGoals: next, updatedAt: Date.now() };
    setSavingsGoalsState(next);
    scheduleSave();
  }, [scheduleSave]);

  const setMonthlyData = useCallback((value: MonthData[] | ((p: MonthData[]) => MonthData[])) => {
    const next = typeof value === 'function' ? value(latestRef.current.monthlyData) : value;
    latestRef.current = { ...latestRef.current, monthlyData: next, updatedAt: Date.now() };
    setMonthlyDataState(next);
    scheduleSave();
  }, [scheduleSave]);

  const setKanbanTasks = useCallback((value: KanbanTask[] | ((p: KanbanTask[]) => KanbanTask[])) => {
    const next = typeof value === 'function' ? value(latestRef.current.kanbanTasks) : value;
    latestRef.current = { ...latestRef.current, kanbanTasks: next, updatedAt: Date.now() };
    setKanbanTasksState(next);
    scheduleSave();
  }, [scheduleSave]);

  const setKanbanCategories = useCallback((value: string[] | ((p: string[]) => string[])) => {
    const next = typeof value === 'function' ? value(latestRef.current.kanbanCategories) : value;
    latestRef.current = { ...latestRef.current, kanbanCategories: next, updatedAt: Date.now() };
    setKanbanCategoriesState(next);
    scheduleSave();
  }, [scheduleSave]);

  // ── Load ────────────────────────────────────────────────
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
        const migrated     = migrateMonthlyData(data.monthlyData ?? buildDefaultMonthlyData(), globalIncome);

        let accs: Account[];
        if (data.accounts) {
          accs = data.accounts;
        } else if (data.balances) {
          accs = [
            { id: 'debit',        name: 'Chequing / Debit', amount: data.balances.debit        ?? 0 },
            { id: 'expenses',     name: 'Expenses',          amount: data.balances.expenses     ?? 0 },
            { id: 'tfsa',         name: 'TFSA',              amount: data.balances.tfsa         ?? 0 },
            { id: 'fhsa',         name: 'FHSA',              amount: data.balances.fhsa         ?? 0 },
            { id: 'studentLoans', name: 'Student Loans',     amount: data.balances.studentLoans ?? 0 },
          ];
        } else {
          accs = DEFAULT_ACCOUNTS;
        }

        const goals  = data.savingsGoals     ?? [];
        const ktasks = data.kanbanTasks      ?? [];
        const kcats  = data.kanbanCategories ?? DEFAULT_KANBAN_CATEGORIES;

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
      } else if (snap) {
        // snap is a real DocumentSnapshot with no data (new user) — write
        // defaults so Firestore creates the collection/document immediately.
        // We only do this when the read definitively returned "no document";
        // if snap is null the read timed out and we must NOT overwrite.
        try {
          await setDoc(doc(db, COLLECTION, syncCode), {
            ...latestRef.current,
            updatedAt: Date.now(),
          });
        } catch (writeErr) {
          console.error('Initial cloud write failed:', writeErr);
        }
      }
    } catch (e) {
      console.error('Cloud load failed:', e);
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
    accounts,         setAccounts,
    savingsGoals,     setSavingsGoals,
    monthlyData,      setMonthlyData,
    kanbanTasks,      setKanbanTasks,
    kanbanCategories, setKanbanCategories,
    refresh: loadFromCloud,
  };
}

export function generateSyncCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
}
