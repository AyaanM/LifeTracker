import { useState } from 'react';
import { generateSyncCode } from './useCloudData';

export interface UserProfile {
  id: string;
  name: string;
  passwordHash: string;
  salt: string;
  syncCode: string;
  createdAt: number;
}

const STORAGE_KEY = 'tbf-profiles';
const SESSION_KEY = 'tbf-active-profile';

function loadProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persist(profiles: UserProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + password));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function makeSalt(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Session helpers (used by App.tsx) ──────────────────────
export function getSessionProfile(): UserProfile | null {
  try {
    const id = sessionStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return loadProfiles().find(p => p.id === id) ?? null;
  } catch { return null; }
}

export function setSessionProfile(id: string): void {
  sessionStorage.setItem(SESSION_KEY, id);
}

export function clearSessionProfile(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Hook ────────────────────────────────────────────────────
export function useProfiles() {
  const [profiles, setProfilesState] = useState<UserProfile[]>(loadProfiles);

  async function createProfile(name: string, password: string): Promise<UserProfile> {
    const salt = makeSalt();
    const passwordHash = await hashPassword(password, salt);
    const profile: UserProfile = {
      id: `p-${Date.now()}`,
      name: name.trim(),
      passwordHash,
      salt,
      syncCode: generateSyncCode(),
      createdAt: Date.now(),
    };
    const next = [...profiles, profile];
    setProfilesState(next);
    persist(next);
    return profile;
  }

  async function verifyPassword(profileId: string, password: string): Promise<boolean> {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return false;
    const hash = await hashPassword(password, profile.salt);
    return hash === profile.passwordHash;
  }

  function deleteProfile(id: string): void {
    const next = profiles.filter(p => p.id !== id);
    setProfilesState(next);
    persist(next);
  }

  return { profiles, createProfile, verifyPassword, deleteProfile };
}
