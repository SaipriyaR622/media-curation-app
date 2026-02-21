import { useState, useEffect, useCallback } from 'react';
import { Profile } from '@/lib/types';

const STORAGE_KEY = 'fragments-profile';
const LEGACY_STORAGE_KEY = 'cozy-library-profile';

const defaultProfile: Profile = {
  name: 'Reader',
  bio: 'reader, annotator, lover of slow burns',
  yearlyGoal: 24,
  avatarUrl: '',
};

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? { ...defaultProfile, ...JSON.parse(raw) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  return { profile, updateProfile };
}
