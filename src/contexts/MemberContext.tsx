import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { BYPASS_KEY, GATE_KEY, LAUNCHED } from '@/lib/gate';
import { setAwardHook } from '@/lib/analytics';
import { audit } from '@/lib/audit';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Truly's World membership — signup via email OTP, then set a password;
 * login via password (or OTP fallback). See supabase/AUTH_SETUP.md.
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

/** Map Supabase auth errors to gate-friendly copy. */
export function formatAuthError(err: unknown): string {
  let message = '';
  let status: string | number | undefined;

  if (typeof err === 'string') {
    message = err;
  } else if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    message = String(e.message ?? e.error_description ?? e.error ?? e.msg ?? '');
    status = (e.status as string | number | undefined) ?? (e.code as string | number | undefined);
    // Empty Auth bodies sometimes stringify as "{}"
    if (!message || message === '{}' || message === '[object Object]') {
      message = '';
    }
  }

  const m = message.toLowerCase();
  if (m.includes('rate limit')) {
    return 'too many emails just now — wait a few minutes, or enter a code you already received ♥';
  }
  if (/error sending|smtp|unable to send|magic link|error sending magic link/i.test(m)) {
    return 'could not send the email code — check SMTP / try again in a minute';
  }
  if (/signups not allowed|user not found|unable to validate/i.test(message)) {
    return 'no account for that email — join the list first ♥';
  }
  if (/invalid login|invalid credentials|email not confirmed/i.test(m)) {
    return 'wrong email or password ♥';
  }
  if (/password should be|password.*at least|weak password/i.test(m)) {
    return 'password must be at least 8 characters';
  }
  if (message && message !== '{}') return message;
  if (status) return `could not send signup code (auth ${status}) — check Supabase SMTP and try again`;
  return 'could not send signup code — check Supabase URL/key + SMTP, then try again';
}

const PENDING_KEY = 'tw-pending-member';

export function savePendingProfile(p: PendingProfile) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function loadPendingProfile(): PendingProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PendingProfile;
    if (!p?.email) return null;
    return {
      first: String(p.first || ''),
      last: String(p.last || ''),
      email: String(p.email).trim().toLowerCase(),
      phone: String(p.phone || ''),
    };
  } catch { return null; }
}

export function clearPendingProfile() {
  try {
    localStorage.removeItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch { /* ignore */ }
}

function hasPasswordSet(meta?: Record<string, unknown> | null): boolean {
  return meta?.password_set === true || meta?.password_set === 'true';
}

function profileFromMetadata(user: { email?: string | null; user_metadata?: Record<string, unknown> }): PendingProfile | null {
  const meta = user.user_metadata || {};
  const first = String(meta.first ?? meta.first_name ?? '').trim();
  const last = String(meta.last ?? meta.last_name ?? '').trim();
  const phone = String(meta.phone ?? '').trim();
  const email = String(user.email || meta.email || '').trim().toLowerCase();
  if (!email || (!first && !last)) return null;
  return { first, last, email, phone };
}

function resolvePending(user?: { email?: string | null; user_metadata?: Record<string, unknown> } | null): PendingProfile | null {
  const stored = loadPendingProfile();
  if (stored?.first && stored?.last) return stored;
  if (user) {
    const fromMeta = profileFromMetadata(user);
    if (fromMeta?.first && fromMeta?.last) return fromMeta;
  }
  if (stored && user) {
    const meta = profileFromMetadata(user);
    return {
      first: stored.first || meta?.first || '',
      last: stored.last || meta?.last || '',
      email: stored.email || meta?.email || String(user.email || '').toLowerCase(),
      phone: stored.phone || meta?.phone || '',
    };
  }
  return stored;
}

interface MemberState {
  member: Member | null;
  isMember: boolean;
  ready: boolean;
  unlocked: boolean;
  needsProfile: boolean;
  /** Session + member row exist but password not set yet. */
  needsPassword: boolean;
  sessionEmail: string | null;
  requestOtp: (email: string) => Promise<OkErr>;
  verifyOtp: (email: string, token: string) => Promise<OkErr & { hasProfile?: boolean; needsPassword?: boolean }>;
  completeProfile: (d: PendingProfile) => Promise<OkErr>;
  beginJoin: (d: PendingProfile) => Promise<OkErr>;
  setPassword: (password: string) => Promise<OkErr>;
  signInWithPassword: (email: string, password: string) => Promise<OkErr>;
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
  const [passwordReady, setPasswordReady] = useState(false);
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

  const settleSession = useCallback(async (
    userId: string,
    user?: { email?: string | null; user_metadata?: Record<string, unknown> } | null,
  ) => {
    const email = (user?.email || '').toLowerCase() || null;
    setSessionEmail(email);
    setPasswordReady(hasPasswordSet(user?.user_metadata));
    let m = await refreshMember(userId);
    if (m) {
      clearPendingProfile();
      return m;
    }
    if (finishingRef.current) return null;

    const pending = resolvePending(user);
    if (!pending?.first?.trim() || !pending?.last?.trim()) return null;

    finishingRef.current = true;
    try {
      const res = await upsertProfile(pending, userId);
      if (!res.ok) return null;
      m = await loadMember(userId);
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
          await settleSession(session.user.id, session.user);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        setMember(null);
        setSessionEmail(null);
        setPasswordReady(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        void settleSession(session.user.id, session.user);
      } else {
        setPasswordReady(hasPasswordSet(session.user.user_metadata));
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
        shouldCreateUser: false,
      },
    });
    if (error) return { ok: false, error: formatAuthError(error) };
    audit('auth.otp_requested', { email: e, mode: 'login' });
    return { ok: true };
  }, []);

  const beginJoin = useCallback(async (d: PendingProfile): Promise<OkErr> => {
    if (!supabaseConfigured) {
      return { ok: false, error: 'auth not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }
    const email = d.email.trim().toLowerCase();
    const profile = { ...d, email };
    savePendingProfile(profile);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            first: profile.first.trim(),
            last: profile.last.trim(),
            phone: profile.phone,
          },
        },
      });
      if (error) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.error('[auth] beginJoin', error);
        }
        return { ok: false, error: formatAuthError(error) };
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[auth] beginJoin threw', err);
      }
      return { ok: false, error: formatAuthError(err) };
    }
    audit('auth.otp_requested', { email, mode: 'join' });
    return { ok: true };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string): Promise<OkErr & { hasProfile?: boolean; needsPassword?: boolean }> => {
    if (!supabaseConfigured) {
      return { ok: false, error: 'auth not configured' };
    }
    const e = email.trim().toLowerCase();
    const t = token.trim();
    if (!e || !t) return { ok: false, error: 'email and code required' };
    if (t.length < 6) return { ok: false, error: 'enter the 6-digit code from your email' };
    const { data, error } = await supabase.auth.verifyOtp({
      email: e,
      token: t,
      type: 'email',
    });
    if (error || !data.session?.user) {
      return { ok: false, error: formatAuthError(error || 'invalid code') };
    }
    audit('auth.otp_verified', { email: e });
    const m = await settleSession(data.session.user.id, data.session.user);
    clearLegacyGate();
    const needsPw = !!m && !hasPasswordSet(data.session.user.user_metadata);
    return { ok: true, hasProfile: !!m, needsPassword: needsPw };
  }, [settleSession]);

  const completeProfile = useCallback(async (d: PendingProfile): Promise<OkErr> => {
    if (!supabaseConfigured) return { ok: false, error: 'auth not configured' };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, error: 'enter the 6-digit code from your email first' };
    savePendingProfile({ ...d, email: d.email.trim().toLowerCase() });
    return upsertProfile(d, session.user.id);
  }, [upsertProfile]);

  const setPassword = useCallback(async (password: string): Promise<OkErr> => {
    if (!supabaseConfigured) return { ok: false, error: 'auth not configured' };
    if (password.length < 8) return { ok: false, error: 'password must be at least 8 characters' };
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { ok: false, error: 'confirm your email first' };
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    });
    if (error) return { ok: false, error: formatAuthError(error) };
    setPasswordReady(true);
    audit('auth.password_set', { email: session.user.email });
    if (data.user) await settleSession(data.user.id, data.user);
    return { ok: true };
  }, [settleSession]);

  const signInWithPassword = useCallback(async (email: string, password: string): Promise<OkErr> => {
    if (!supabaseConfigured) {
      return { ok: false, error: 'auth not configured — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY' };
    }
    const e = email.trim().toLowerCase();
    if (!e || !password) return { ok: false, error: 'email and password required' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });
    if (error || !data.session?.user) {
      return { ok: false, error: formatAuthError(error || 'wrong email or password') };
    }
    // Password login implies they have a password; stamp metadata if missing (older accounts).
    if (!hasPasswordSet(data.session.user.user_metadata)) {
      await supabase.auth.updateUser({ data: { password_set: true } });
    }
    audit('auth.password_login', { email: e });
    await settleSession(data.session.user.id, {
      ...data.session.user,
      user_metadata: { ...data.session.user.user_metadata, password_set: true },
    });
    clearLegacyGate();
    return { ok: true };
  }, [settleSession]);

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
    setPasswordReady(false);
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

  // PRE-LAUNCH: only staff bypass opens the site. Flip LAUNCHED at go-live.
  // DEV (localhost `npm run dev`): auto-unlock so building never hits the login
  // wall. import.meta.env.DEV is false in production builds, so this never ships.
  const unlocked = import.meta.env.DEV || bypass || (LAUNCHED && !!member && passwordReady);
  const needsProfile = !!sessionEmail && !member && !bypass;
  const needsPassword = !!sessionEmail && !!member && !passwordReady && !bypass;

  return (
    <Ctx.Provider value={{
      member,
      isMember: !!member,
      ready,
      unlocked,
      needsProfile,
      needsPassword,
      sessionEmail,
      requestOtp,
      verifyOtp,
      completeProfile,
      beginJoin,
      setPassword,
      signInWithPassword,
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
