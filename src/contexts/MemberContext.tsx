import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GATE_KEY } from '@/lib/gate';
import { setAwardHook } from '@/lib/analytics';

/**
 * Truly's World membership.
 *
 * DEMO MODE (current): accounts, points, and gameplay live in localStorage so
 * the whole member experience is clickable with zero backend. The provider is
 * written behind a small interface (signUp / logIn / logOut / award) so a real
 * backend (Supabase auth + a `members` / `plays` table) can drop in later
 * without touching any screen — swap the bodies of these functions.
 *
 * Laylo already handles the email+SMS capture on the gate (TrulyList →
 * /api/subscribe). Membership sits on top of that: the same signup that joins
 * the Laylo list also creates the account and unlocks the site.
 */

export interface GamePlay {
  game: string;   // stable id, used to de-dupe
  label: string;  // human label for the log
  points: number;
  at: number;     // epoch ms
}

export interface Member {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  memberSince: number;
  points: number;
  plays: GamePlay[];
  redeemed: string[]; // reward ids
}

export interface Tier {
  key: string;
  name: string;
  min: number;      // points to reach
  blurb: string;
}

// Point thresholds for each tier. Tuned for demo; easy to retune later.
export const TIERS: Tier[] = [
  { key: 'newcomer',    name: 'Newcomer',     min: 0,    blurb: 'Welcome to her world.' },
  { key: 'insider',     name: 'Insider',      min: 500,  blurb: 'You know the map.' },
  { key: 'vip',         name: 'VIP',          min: 1500, blurb: 'Front of the line.' },
  { key: 'innercircle', name: 'Inner Circle', min: 4000, blurb: "Truly's inner circle." },
];

export function tierFor(points: number): { tier: Tier; next: Tier | null; toNext: number; pct: number } {
  let tier = TIERS[0];
  for (const t of TIERS) if (points >= t.min) tier = t;
  const idx = TIERS.indexOf(tier);
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  const toNext = next ? Math.max(0, next.min - points) : 0;
  const span = next ? next.min - tier.min : 1;
  const pct = next ? Math.min(100, Math.round(((points - tier.min) / span) * 100)) : 100;
  return { tier, next, toNext, pct };
}

interface MemberState {
  member: Member | null;
  isMember: boolean;
  signUp: (d: { first: string; last: string; email: string; phone: string }) => Member;
  logIn: (email: string) => boolean;
  logOut: () => void;
  award: (game: string, label: string, points: number) => void;
  redeem: (rewardId: string) => void;
}

const Ctx = createContext<MemberState | null>(null);
export const useMember = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMember must be inside MemberProvider');
  return c;
};

const DB_KEY = 'tw-members';     // { [email]: Member }
const CUR_KEY = 'tw-current';    // current email

const uid = () => 'm_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const loadDB = (): Record<string, Member> => {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '{}'); } catch { return {}; }
};
const saveDB = (db: Record<string, Member>) => {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore */ }
};
const setGate = (on: boolean) => {
  try { on ? localStorage.setItem(GATE_KEY, '1') : localStorage.removeItem(GATE_KEY); } catch { /* ignore */ }
};

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<Member | null>(() => {
    try {
      const cur = localStorage.getItem(CUR_KEY);
      if (!cur) return null;
      return loadDB()[cur] ?? null;
    } catch { return null; }
  });

  // keep the gate flag in sync with membership on mount
  useEffect(() => { if (member) setGate(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((m: Member) => {
    const db = loadDB();
    db[m.email] = m;
    saveDB(db);
    try { localStorage.setItem(CUR_KEY, m.email); } catch { /* ignore */ }
    setMember({ ...m });
  }, []);

  const signUp = useCallback((d: { first: string; last: string; email: string; phone: string }) => {
    const email = d.email.trim().toLowerCase();
    const db = loadDB();
    const existing = db[email];
    const now = Date.now();
    const m: Member = existing ?? {
      id: uid(), first: d.first.trim(), last: d.last.trim(), email,
      phone: d.phone, memberSince: now, points: 0, plays: [], redeemed: [],
    };
    if (!existing) {
      // welcome bonus + a little seeded activity so the dashboard feels alive
      m.plays = [{ game: 'join', label: 'Joined Truly’s World', points: 100, at: now }];
      m.points = 100;
    }
    persist(m);
    setGate(true);
    return m;
  }, [persist]);

  const logIn = useCallback((email: string) => {
    const db = loadDB();
    const m = db[email.trim().toLowerCase()];
    if (!m) return false;
    persist(m);
    setGate(true);
    return true;
  }, [persist]);

  const logOut = useCallback(() => {
    try { localStorage.removeItem(CUR_KEY); } catch { /* ignore */ }
    setGate(false);
    setMember(null);
  }, []);

  // award points for a play; de-duped by game id so a game only scores once
  const award = useCallback((game: string, label: string, points: number) => {
    setMember((prev) => {
      if (!prev) return prev;
      if (prev.plays.some((p) => p.game === game)) return prev; // already counted
      const next: Member = {
        ...prev,
        points: prev.points + points,
        plays: [{ game, label, points, at: Date.now() }, ...prev.plays].slice(0, 60),
      };
      const db = loadDB(); db[next.email] = next; saveDB(db);
      return next;
    });
  }, []);

  // bridge site-wide gameplay events → points (see analytics.ts)
  useEffect(() => { setAwardHook(award); return () => setAwardHook(null); }, [award]);

  const redeem = useCallback((rewardId: string) => {
    setMember((prev) => {
      if (!prev || prev.redeemed.includes(rewardId)) return prev;
      const next = { ...prev, redeemed: [...prev.redeemed, rewardId] };
      const db = loadDB(); db[next.email] = next; saveDB(db);
      return next;
    });
  }, []);

  return (
    <Ctx.Provider value={{ member, isMember: !!member, signUp, logIn, logOut, award, redeem }}>
      {children}
    </Ctx.Provider>
  );
};
