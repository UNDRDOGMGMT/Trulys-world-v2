import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BYPASS_KEY, GATE_KEY } from '@/lib/gate';
import { setAwardHook } from '@/lib/analytics';
import { audit } from '@/lib/audit';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Truly's World membership — Supabase Auth (email OTP) + members / plays tables.
 * Public surface stays close to the old demo API so Gate / Account / SessionChip
 * keep working; bodies talk to Supabase instead of localStorage.
 */

export interface GamePlay {
  game: string;
  label: string;
  points: number;
  at: number;
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
  redeemed: string[];
}

export interface Tier {
  key: string;
  name: string;
  min: number;
  blurb: string;
}

export const TIERS: Tier[] = [
  { key: 'newcomer', name: 'Newcomer', min: 0, blurb: 'Welcome to her world.' },
  { key: 'insider', name: 'Insider', min: 500, blurb: 'You know the map.' },
  { key: 'vip', name: 'VIP', min: 1500, blurb: 'Front of the line.' },
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

type OkErr = { ok: true } | { ok: false; error: string };

interface MemberState {
  member: Member | null;
  isMember: boolean;
  /** Session + member row finished hydrating (or bypass checked). */
  ready: boolean;
  /** Real unlock: authenticated member profile OR staff bypass. */
  unlocked: boolean;
  requestOtp: (email: string) => Promise<OkErr>;
  verifyOtp: (email: string, token: string) => Promise<OkErr & { hasProfile?: boolean }>;
  completeProfile: (d: { first: string; last: string; email: string; phone: string }) => Promise<OkErr>;
  /** @deprecated prefer requestOtp + verifyOtp + completeProfile — kept for type compat */
  signUp: (d: { first: string; last: string; email: string; phone: string }) => Member;
  logIn: (email: string) => boolean;
  logOut: () => void;
  award: (game: string, label: string, points: number) => void;
  redeem: (rewardId: string) => void;
  /** Call after /api/gate-bypass returns ok. */
  enableBypass: () => void;
}

const Ctx = createContext<MemberState | null>(null);
export const useMember = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMember must be inside MemberProvider');
  return c;
};

type MemberRow = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  points: number;
  redeemed: string[] | null;
  member_since: string;
};

const readBypass = () => {
  try { return sessionStorage.getItem(BYPASS_KEY) === '1'; } catch { return false; }
};

const clearLegacyGate = () => {
  try { localStorage.removeItem(GATE_KEY); } catch { /* ignore */ }
};

async function loadMember(userId: string): Promise<Member | null> {
  const { data: row, error } = await supabase
    .from('members')
    .select('id, first, last, email, phone, points, redeemed, member_since')
    .eq('id', userId)
    .maybeSingle();
  if (error || !row) return null;
  const m = row as MemberRow;
  const { data: plays } = await supabase
    .from('plays')
    .select('game, label, points, at')
    .eq('member_id', userId)
    .order('at', { ascending: false })
    .limit(60);
  return {
    id: m.id,
    first: m.first,
    last: m.last,
    email: m.email,
    phone: m.phone,
    memberSince: new Date(m.member_since).getTime(),
    points: m.points,
    redeemed: m.redeemed ?? [],
    plays: (plays ?? []).map((p) => ({
      game: p.game as string,
      label: p.label as string,
      points: p.points as number,
      at: new Date(p.at as string).getTime(),
    })),
  };
}

export const MemberProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [ready, setReady] = useState(false);
  const [bypass, setBypass] = useState(readBypass);

  const refreshMember = useCallback(async (userId: string) => {
    const m = await loadMember(userId);
    setMember(m);
    return m;
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          await refreshMember(session.user.id);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setMember(null);
        return;
      }
      void refreshMember(session.user.id);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshMember]);

  const requestOtp = useCallback(async (email: string): Promise<OkErr> => {
    if (!supabaseConfigured) {
      return { ok: false, error: 'auth not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }
    const e = email.trim().toLowerCase();
    if (!e) return { ok: false, error: 'email required' };
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { shouldCreateUser: true },
    });
    if (error) return { ok: false, error: error.message };
    audit('auth.otp_requested', { email: e });
    return { ok: true };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<OkErr & { hasProfile?: boolean }> => {
    if (!supabaseConfigured) {
      return { ok: false, error: 'auth not configured' };
    }
    const e = email.trim().toLowerCase();
    const t = token.trim();
    if (!e || !t) return { ok: false, error: 'email and code required' };
    const { data, error } = await supabase.auth.verifyOtp({
      email: e,
      token: t,
      type: 'email',
    });
    if (error || !data.session?.user) {
      return { ok: false, error: error?.message || 'invalid code' };
    }
    audit('auth.otp_verified', { email: e });
    const m = await refreshMember(data.session.user.id);
    clearLegacyGate();
    return { ok: true, hasProfile: !!m };
  }, [refreshMember]);

  const completeProfile = useCallback(async (d: {
    first: string; last: string; email: string; phone: string;
  }): Promise<OkErr> => {
    if (!supabaseConfigured) return { ok: false, error: 'auth not configured' };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, error: 'verify your email code first' };
    const email = d.email.trim().toLowerCase();
    const row = {
      id: session.user.id,
      first: d.first.trim(),
      last: d.last.trim(),
      email,
      phone: d.phone,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('members').upsert(row, { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };

    // welcome bonus (de-duped by game id 'join')
    await supabase.rpc('award_play', {
      p_game: 'join',
      p_label: "Joined Truly's World",
      p_points: 100,
    });
    audit('auth.signup_profile', { email, first: row.first, last: row.last });
    await refreshMember(session.user.id);
    clearLegacyGate();
    return { ok: true };
  }, [refreshMember]);

  // legacy sync stubs — Gate no longer uses these for unlock
  const signUp = useCallback((d: { first: string; last: string; email: string; phone: string }): Member => {
    const now = Date.now();
    return {
      id: 'pending',
      first: d.first, last: d.last, email: d.email, phone: d.phone,
      memberSince: now, points: 0, plays: [], redeemed: [],
    };
  }, []);

  const logIn = useCallback((_email: string) => false, []);

  const logOut = useCallback(() => {
    audit('auth.logout', {});
    try { sessionStorage.removeItem(BYPASS_KEY); } catch { /* ignore */ }
    clearLegacyGate();
    setBypass(false);
    setMember(null);
    if (supabaseConfigured) void supabase.auth.signOut();
  }, []);

  const award = useCallback((game: string, label: string, points: number) => {
    if (!supabaseConfigured) return;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.rpc('award_play', {
        p_game: game,
        p_label: label,
        p_points: points,
      });
      if (error) return;
      audit('member.award', { game, label, points });
      await refreshMember(session.user.id);
    })();
  }, [refreshMember]);

  const redeem = useCallback((rewardId: string) => {
    if (!supabaseConfigured) return;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId });
      if (error) return;
      audit('member.redeem', { reward_id: rewardId });
      await refreshMember(session.user.id);
    })();
  }, [refreshMember]);

  const enableBypass = useCallback(() => {
    try { sessionStorage.setItem(BYPASS_KEY, '1'); } catch { /* ignore */ }
    setBypass(true);
    clearLegacyGate();
    audit('auth.gate_bypass', {});
  }, []);

  useEffect(() => { setAwardHook(award); return () => setAwardHook(null); }, [award]);

  const unlocked = !!member || bypass;

  return (
    <Ctx.Provider value={{
      member,
      isMember: !!member,
      ready,
      unlocked,
      requestOtp,
      verifyOtp,
      completeProfile,
      signUp,
      logIn,
      logOut,
      award,
      redeem,
      enableBypass,
    }}>
      {children}
    </Ctx.Provider>
  );
};
