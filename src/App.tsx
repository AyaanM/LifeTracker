import { useState } from 'react';
import type { NavSection } from './types';
import { useCloudData, generateSyncCode } from './hooks/useCloudData';
import { useLocalStorage } from './hooks/useLocalStorage';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import MonthlyBudget from './components/MonthlyBudget';
import ExpenseLog from './components/ExpenseLog';
import SavingsProjection from './components/SavingsProjection';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [syncCode] = useLocalStorage<string>('tbf-sync-code', generateSyncCode());

  const {
    syncStatus,
    balances,
    setBalances,
    monthlyData,
    setMonthlyData,
    expenses,
    setExpenses,
    refresh,
  } = useCloudData(syncCode);

  if (syncStatus === 'loading') {
    return (
      <div className="cloud-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading your data…</p>
      </div>
    );
  }

  return (
    <Layout
      activeSection={activeSection}
      onNavigate={setActiveSection}
    >
      {activeSection === 'dashboard' && (
        <Dashboard
          balances={balances}
          setBalances={setBalances}
          monthlyData={monthlyData}
          setMonthlyData={setMonthlyData}
          expenses={expenses}
          setExpenses={setExpenses}
          syncStatus={syncStatus}
          onRefresh={refresh}
        />
      )}
      {activeSection === 'budget' && (
        <MonthlyBudget monthlyData={monthlyData} setMonthlyData={setMonthlyData} expenses={expenses} />
      )}
      {activeSection === 'expenses' && (
        <ExpenseLog expenses={expenses} setExpenses={setExpenses} />
      )}
      {activeSection === 'savings' && (
        <SavingsProjection balances={balances} monthlyData={monthlyData} expenses={expenses} />
      )}
    </Layout>
  );
}
