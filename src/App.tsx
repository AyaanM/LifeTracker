import { useState } from 'react';
import type { NavSection } from './types';
import { useCloudData, generateSyncCode } from './hooks/useCloudData';
import { useLocalStorage } from './hooks/useLocalStorage';
import Layout from './components/Layout';
import Fin_Dashboard from './components/Fin_Dashboard';
import MonthlyBudget from './components/MonthlyBudget';
import Kanban from './components/Kanban';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('kanban');
  const [syncCode] = useLocalStorage<string>('tbf-sync-code', generateSyncCode());

  const {
    syncStatus,
    accounts, setAccounts,
    savingsGoals, setSavingsGoals,
    monthlyData, setMonthlyData,
    kanbanTasks, setKanbanTasks,
    kanbanCategories, setKanbanCategories,
    refresh,
  } = useCloudData(syncCode);

  if (syncStatus === 'loading') {
    return (
      <div className="cloud-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <Layout activeSection={activeSection} onNavigate={setActiveSection}>
      {activeSection === 'fin_dashboard' && (
        <Fin_Dashboard
          accounts={accounts} setAccounts={setAccounts}
          savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals}
          monthlyData={monthlyData} syncStatus={syncStatus} onRefresh={refresh}
        />
      )}
      {activeSection === 'budget' && (
        <MonthlyBudget monthlyData={monthlyData} setMonthlyData={setMonthlyData} />
      )}
      {activeSection === 'kanban' && (
        <Kanban
          tasks={kanbanTasks} setTasks={setKanbanTasks}
          categories={kanbanCategories} setCategories={setKanbanCategories}
        />
      )}
    </Layout>
  );
}
