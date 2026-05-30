import { useState } from 'react';
import type { NavSection } from '../types';
import type { UserProfile } from '../hooks/useProfiles';
import { useCloudData } from '../hooks/useCloudData';
import Layout from './Layout';
import Fin_Dashboard from './Fin_Dashboard';
import MonthlyBudget from './MonthlyBudget';
import Kanban from './Kanban';
import { Loader2 } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onSignOut: () => void;
}

export default function MainApp({ profile, onSignOut }: Props) {
  const [activeSection, setActiveSection] = useState<NavSection>('kanban');

  const {
    syncStatus,
    accounts,         setAccounts,
    savingsGoals,     setSavingsGoals,
    monthlyData,      setMonthlyData,
    kanbanTasks,      setKanbanTasks,
    kanbanCategories, setKanbanCategories,
  } = useCloudData(profile.syncCode);

  if (syncStatus === 'loading') {
    return (
      <div className="cloud-loading">
        <Loader2 size={32} className="spin" />
        <p>Logging you in now... don't stress</p>
      </div>
    );
  }

  return (
    <Layout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      syncStatus={syncStatus}
      profileName={profile.name}
      onSignOut={onSignOut}
    >
      {activeSection === 'fin_dashboard' && (
        <Fin_Dashboard
          accounts={accounts}     setAccounts={setAccounts}
          savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals}
          monthlyData={monthlyData}
        />
      )}
      {activeSection === 'budget' && (
        <MonthlyBudget monthlyData={monthlyData} setMonthlyData={setMonthlyData} />
      )}
      {activeSection === 'kanban' && (
        <Kanban
          tasks={kanbanTasks}         setTasks={setKanbanTasks}
          categories={kanbanCategories} setCategories={setKanbanCategories}
        />
      )}
    </Layout>
  );
}
