import { useState } from 'react';
import type { ReactNode } from 'react';
import type { NavSection } from '../types';
import type { SyncStatus } from '../hooks/useCloudData';
import { LayoutDashboard, BookOpen, KanbanSquare, Menu, X } from 'lucide-react';

interface Props {
  activeSection: NavSection;
  onNavigate: (s: NavSection) => void;
  syncStatus: SyncStatus;
  children: ReactNode;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'kanban',    label: 'Tasks', icon: KanbanSquare },
  { id: 'fin_dashboard', label: 'Finance Dashboard', icon: LayoutDashboard },
  { id: 'budget',    label: 'Monthly Budget', icon: BookOpen },
];

const SYNC_LABEL: Record<SyncStatus, string> = {
  idle:    '✓ Synced',
  saving:  'Saving…',
  error:   'Sync error',
  loading: 'Loading…',
};

export default function Layout({ activeSection, onNavigate, syncStatus, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNav(id: NavSection) {
    onNavigate(id);
    setMobileOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-name">The Life Tracker</span>
            <span className="brand-tagline">Ayaan Merchant</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeSection === item.id ? 'nav-item--active' : ''}`}
                onClick={() => handleNav(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span>Sign Out</span>
        </div>
      </aside>

      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <div className="main-wrapper">
        <header className="topbar">
          <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="topbar-right">
            <span className="topbar-tagline">Be Patient, Empires aren't built in a day</span>
            <span className={`sync-status-badge sync-status-badge--${syncStatus}`}>
              {SYNC_LABEL[syncStatus]}
            </span>
          </div>
        </header>
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
