import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { audit } from '@/lib/audit';

interface UnlockState {
  heartsCollected: Set<string>;
  totalHearts: number;
  requiredHearts: number;
  isVaultUnlocked: boolean;
  collectHeart: (id: string) => void;
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
}

const UnlockContext = createContext<UnlockState | null>(null);

export const useUnlock = () => {
  const ctx = useContext(UnlockContext);
  if (!ctx) throw new Error('useUnlock must be inside UnlockProvider');
  return ctx;
};

export const UnlockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [heartsCollected, setHeartsCollected] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ty-hearts');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const [soundOn, setSoundOnState] = useState(() => localStorage.getItem('ty-sound') === 'true');
  const [reduceMotion, setReduceMotionState] = useState(() => localStorage.getItem('ty-motion') === 'true');

  useEffect(() => {
    localStorage.setItem('ty-hearts', JSON.stringify([...heartsCollected]));
  }, [heartsCollected]);

  useEffect(() => { localStorage.setItem('ty-sound', String(soundOn)); }, [soundOn]);
  useEffect(() => { localStorage.setItem('ty-motion', String(reduceMotion)); }, [reduceMotion]);

  const collectHeart = useCallback((id: string) => {
    setHeartsCollected(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      audit('heart.collect', { heart_id: id, total: next.size });
      return next;
    });
  }, []);

  const setSoundOn = useCallback((v: boolean) => {
    setSoundOnState(v);
    audit('prefs.sound', { on: v });
  }, []);

  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    audit('prefs.motion', { reduce: v });
  }, []);

  const requiredHearts = 3;
  const isVaultUnlocked = heartsCollected.size >= requiredHearts;

  return (
    <UnlockContext.Provider value={{
      heartsCollected,
      totalHearts: 5,
      requiredHearts,
      isVaultUnlocked,
      collectHeart,
      soundOn,
      setSoundOn,
      reduceMotion,
      setReduceMotion,
    }}>
      {children}
    </UnlockContext.Provider>
  );
};
