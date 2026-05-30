import { useState } from 'react';
import type { UserProfile } from './hooks/useProfiles';
import { getSessionProfile, setSessionProfile, clearSessionProfile } from './hooks/useProfiles';
import ProfileScreen from './components/ProfileScreen';
import MainApp from './components/MainApp';

export default function App() {
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(getSessionProfile);

  function handleUnlock(profile: UserProfile) {
    setSessionProfile(profile.id);
    setActiveProfile(profile);
  }

  function handleSignOut() {
    clearSessionProfile();
    setActiveProfile(null);
  }

  if (!activeProfile) {
    return <ProfileScreen onUnlock={handleUnlock} />;
  }

  return <MainApp profile={activeProfile} onSignOut={handleSignOut} />;
}
