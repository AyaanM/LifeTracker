import { useState } from 'react';
import { useProfiles } from '../hooks/useProfiles';
import type { UserProfile } from '../hooks/useProfiles';
import { User, Plus, Lock, Eye, EyeOff, Trash2 } from 'lucide-react';

interface Props {
  onUnlock: (profile: UserProfile) => void;
}

export default function ProfileScreen({ onUnlock }: Props) {
  const { profiles, createProfile, verifyPassword, deleteProfile } = useProfiles();

  const [mode, setMode]         = useState<'list' | 'create'>(profiles.length === 0 ? 'create' : 'list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pw, setPw]             = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [pwError, setPwError]   = useState('');

  const [newName, setNewName]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [newPwConf, setNewPwConf] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [busy, setBusy]           = useState(false);

  async function handleUnlock() {
    if (!selectedId) return;
    setPwError('');
    const ok = await verifyPassword(selectedId, pw);
    if (ok) {
      onUnlock(profiles.find(p => p.id === selectedId)!);
    } else {
      setPwError('Incorrect password');
    }
  }

  async function handleCreate() {
    setCreateErr('');
    if (!newName.trim())      return setCreateErr('Name is required');
    if (!newPw)               return setCreateErr('Password is required');
    if (newPw !== newPwConf)  return setCreateErr('Passwords do not match');
    setBusy(true);
    try {
      const profile = await createProfile(newName, newPw);
      onUnlock(profile);
    } finally {
      setBusy(false);
    }
  }

  function selectProfile(id: string) {
    setSelectedId(prev => prev === id ? null : id);
    setPw('');
    setPwError('');
    setShowPw(false);
  }

  function openCreate() {
    setMode('create');
    setNewName(''); setNewPw(''); setNewPwConf('');
    setCreateErr(''); setShowNewPw(false);
  }

  return (
    <div className="profile-screen">
      <div className="profile-card">

        {/* Brand */}
        <div className="profile-brand">
          <span className="profile-brand-name">The Life Tracker</span>
          <span className="profile-brand-sub">Ayaan Merchant</span>
        </div>

        {mode === 'list' ? (
          <>
            <p className="profile-screen-hint">Select a profile to continue</p>

            <div className="profile-list">
              {profiles.map(profile => (
                <div
                  key={profile.id}
                  className={`profile-item ${selectedId === profile.id ? 'profile-item--open' : ''}`}
                >
                  <button className="profile-item-row" onClick={() => selectProfile(profile.id)}>
                    <div className="profile-avatar"><User size={15} /></div>
                    <span className="profile-item-name">{profile.name}</span>
                  </button>

                  {selectedId === profile.id && (
                    <div className="profile-pw-area">
                      <div className="profile-pw-field">
                        <Lock size={13} className="profile-field-icon" />
                        <input
                          autoFocus
                          type={showPw ? 'text' : 'password'}
                          placeholder="Password"
                          value={pw}
                          onChange={e => { setPw(e.target.value); setPwError(''); }}
                          onKeyDown={e => { if (e.key === 'Enter') handleUnlock(); }}
                          className="profile-pw-input"
                        />
                        <button className="profile-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                          {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                      <div className="profile-pw-actions">
                        <button onClick={handleUnlock} className="btn btn-primary btn-sm">Enter</button>
                        <button
                          onClick={() => { deleteProfile(profile.id); setSelectedId(null); }}
                          className="icon-btn icon-btn--cancel"
                          title="Delete this profile"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {pwError && <p className="profile-error">{pwError}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="profile-new-btn" onClick={openCreate}>
              <Plus size={14} /> New Profile
            </button>
          </>
        ) : (
          <>
            <p className="profile-screen-hint">
              {profiles.length === 0 ? 'Create your first profile to get started' : 'Create a new profile'}
            </p>

            <div className="profile-create-form">
              <input
                autoFocus
                type="text"
                placeholder="Your name"
                value={newName}
                onChange={e => { setNewName(e.target.value); setCreateErr(''); }}
                className="profile-text-input"
              />
              <div className="profile-pw-field">
                <Lock size={13} className="profile-field-icon" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setCreateErr(''); }}
                  className="profile-pw-input"
                />
                <button className="profile-pw-toggle" onClick={() => setShowNewPw(v => !v)} tabIndex={-1}>
                  {showNewPw ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              <div className="profile-pw-field">
                <Lock size={13} className="profile-field-icon" />
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="Confirm password"
                  value={newPwConf}
                  onChange={e => { setNewPwConf(e.target.value); setCreateErr(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  className="profile-pw-input"
                />
              </div>

              {createErr && <p className="profile-error">{createErr}</p>}

              <div className="profile-create-actions">
                <button onClick={handleCreate} disabled={busy} className="btn btn-primary">
                  {busy ? 'Creating…' : 'Create Profile'}
                </button>
                {profiles.length > 0 && (
                  <button onClick={() => setMode('list')} className="btn btn-ghost">Back</button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
