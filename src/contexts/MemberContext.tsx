import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BYPASS_KEY, GATE_KEY } from '@/lib/gate';
import { setAwardHook } from '@/lib/analytics';
import { audit } from '@/lib/audit';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Truly's World membership — Supabase Auth (email magic link + OTP) + members / plays.
 *
 * Join flow: save pending profile → signInWithOtp (redirects back to this origin) →
 * on session, upsert members from pending. Works whether the email is a
 * confirmation link (Supabase default) or a 6-digit {{ .Token }} OTP.
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

export interface PendingProfile {
  first: string;
  last: string;
  email: string;
  phone: string;
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

const PENDING_KEY = 'tw-pending-member';

export function savePendingProfile(p: PendingProfile) {
  try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function loadPendingProfile(): PendingProfile | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingProfile;
    if (!p?.email) return null;
    return p;
  } catch { return null; }
}

export function clearPendingProfile() {
  try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

interface MemberState {
  member: Member | null;
  isMember: boolean;
  ready: boolean;
  unlocked: boolean;
  /** Authenticated in Supabase but no `members` row yet. */
  needsProfile: boolean;
  sessionEmail: string | null;
  requestOtp: (email: string) => Promise<OkErr>;
  verifyOtp: (email: string, token: string) => Promise<OkErr & { hasProfile?: boolean }>;
  completeProfile: (d: PendingProfile) => Promise<OkErr>;
  /** Start join: persist pending + send magic link / OTP email. */
  beginJoin: (d: PendingProfile) => Promise<OkErr>;
  signUp: (d: PendingProfile) => Member;
  logIn: (email: string) => boolean;
  logOut: () => void;
  award: (game: string, label: string, points: number) => void;
  redeem: (rewardId: string) => void;
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

const redirectTo = () => {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/`;
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
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const finishingRef = useRef(false);

  const refreshMember = useCallback(async (userId: string) => {
    const m = await loadMember(userId);
    setMember(m);
    return m;
  }, []);

  const upsertProfile = useCallback(async (d: PendingProfile, userId: string): Promise<OkErr> => {
    const email = d.email.trim().toLowerCase();
    const row = {
      id: userId,
      first: d.first.trim(),
      last: d.last.trim(),
      email,
      phone: d.phone,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('members').upsert(row, { onConflict: 'id' });
    if (error) return { ok: false, error: error.message };

    await supabase.rpc('award_play', {
      p_game: 'join',
      p_label: "Joined Truly's World",
      p_points: 100,
    });
    audit('auth.signup_profile', { email, first: row.first, last: row.last });
    clearPendingProfile();
    clearLegacyGate();
    await refreshMember(userId);
    return { ok: true };
  }, [refreshMember]);

  /** After magic-link / OTP session: create members row from pending if needed. */
  const settleSession = useCallback(async (userId: string, email?: string | null) => {
    setSessionEmail((email || '').toLowerCase() || null);
    let m = await refreshMember(userId);
    if (m) {
      clearPendingProfile();
      return m;
    }
    if (finishingRef.current) return null;
    const pending = loadPendingProfile();
    if (!pending) return null;
    finishingRef.current = true;
    try {
      const res = await upsertProfile(pending, userId);
      if (res.ok) m = await loadMember(userId);
      else return null;
      if (m) setMember(m);
      return m;
    } finally {
      finishingRef.current = false;
    }
  }, [refreshMember, upsertProfile]);

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
          await settleSession(session.user.id, session.user.email);
          // clean PKCE / magic-link hash junk from the address bar
          if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
            window.history.replaceState({}, '', window.location.pathname || '/');
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setMember(null);
        setSessionEmail(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        void settleSession(session.user.id, session.user.email);
      } else {
        void refreshMember(session.user.id);
      }
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [refreshMember, settleSession]);

  const requestOtp = useCallback(async (email: string): Promise<OkErr> => {
    if (!supabaseConfigured) {
      return { ok: false, error: 'auth not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }
    const e = email.trim().toLowerCase();
    if (!e) return { ok: false, error: 'email required' };
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo(),
      },
    });
    if (error) return { ok: false, error: error.message };
    audit('auth.otp_requested', { email: e });
    return { ok: true };
  }, []);

  const beginJoin = useCallback(async (d: PendingProfile): Promise<OkErr> => {
    const email = d.email.trim().toLowerCase();
    savePendingProfile({ ...d, email });
    return requestOtp(email);
  }, [requestOtp]);

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
    const m = await settleSession(data.session.user.id, data.session.user.email);
    clearLegacyGate();
    return { ok: true, hasProfile: !!m };
  }, [settleSession]);

  const completeProfile = useCallback(async (d: PendingProfile): Promise<OkErr> => {
    if (!supabaseConfigured) return { ok: false, error: 'auth not configured' };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, error: 'confirm your email first — open the link we sent' };
    savePendingProfile({ ...d, email: d.email.trim().toLowerCase() });
    return upsertProfile(d, session.user.id);
  }, [upsertProfile]);

  const signUp = useCallback((d: PendingProfile): Member => {
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
    clearPendingProfile();
    clearLegacyGate();
    setBypass(false);
    setMember(null);
    setSessionEmail(null);
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
  const needsProfile = !!sessionEmail && !member && !bypass;

  return (
    <Ctx.Provider value={{
      member,
      isMember: !!member,
      ready,
      unlocked,
      needsProfile,
      sessionEmail,
      requestOtp,
      verifyOtp,
      completeProfile,
      beginJoin,
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
