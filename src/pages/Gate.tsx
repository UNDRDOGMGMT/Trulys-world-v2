import React, { useEffect, useRef, useState } from 'react';
import TrulyList from '@/components/TrulyList';
import { useMember, loadPendingProfile, type PendingProfile } from '@/contexts/MemberContext';

/**
 * Gate auth: enter the list → 6-digit email code → unlock.
 * Profile (name/phone) is kept in localStorage + Supabase user_metadata so
 * verify never asks them to re-type.
 *
 * LAUNCH = 12:00am ET on July 31 2026 (= 9:00pm PT July 30).
 */
const LAUNCH = new Date('2026-07-31T00:00:00-04:00').getTime();

const PHOTO_W = 2400, PHOTO_H = 2979;
const STAGE_W = `max(calc(var(--z,1) * 100vw), calc(var(--z,1) * 100vh * ${PHOTO_W} / ${PHOTO_H}))`;
const STAGE_H = `max(calc(var(--z,1) * 100vh), calc(var(--z,1) * 100vw * ${PHOTO_H} / ${PHOTO_W}))`;
const INK = { left: '54.4%', top: '49.5%', rotate: 4.6, size: 0.0667 };

const pad = (n: number) => String(n).padStart(2, '0');

const CELL = 0.62; // em
const INK_SHIFT: Record<string, number> = {
  '0': -0.012, '1': -0.022, '2': -0.103, '3': 0.010, '4': 0.007,
  '5': 0.001, '6': -0.004, '7': -0.005, '8': 0.001, '9': -0.005,
};

const Digit: React.FC<{ c: string }> = ({ c }) => (
  <span style={{ display: 'inline-block', width: `${CELL}em`, textAlign: 'center' }}>
    <span style={{ display: 'inline-block', transform: `translateX(${INK_SHIFT[c] ?? 0}em)` }}>{c}</span>
  </span>
);

const Colon: React.FC = () => (
  <span style={{ position: 'relative', display: 'inline-block', width: '0.28em', height: 0 }} aria-hidden>
    {[0.36, 0.13].map((b) => (
      <span key={b} style={{
        position: 'absolute', left: '50%', bottom: `${b}em`,
        width: '0.118em', height: '0.118em', marginLeft: '-0.059em',
        borderRadius: '50%', background: 'currentColor',
      }} />
    ))}
  </span>
);

const Clock: React.FC<{ parts: number[] }> = ({ parts }) => (
  <>
    {parts.map((n, i) => (
      <React.Fragment key={i}>
        {i > 0 && <Colon />}
        {pad(n).split('').map((c, j) => <Digit key={j} c={c} />)}
      </React.Fragment>
    ))}
  </>
);

const Countdown: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => {
  const [t, setT] = useState(() => Math.max(0, LAUNCH - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setT(Math.max(0, LAUNCH - Date.now())), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.floor(t / 1000);
  const dd = Math.floor(s / 86400), hh = Math.floor((s % 86400) / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
  return <div className={className} style={style}><Clock parts={[dd, hh, mm, ss]} /></div>;
};

type Mode = 'join' | 'login' | 'code' | 'otp' | 'finish';

const inputCls =
  'rounded-full border-2 border-[#f0b4e4]/55 bg-black/45 px-4 py-2 text-center font-display text-sm text-[#ffd9f2] outline-none backdrop-blur-sm placeholder:text-[#f0b4e4]/45 focus:border-[#f0b4e4]';
const inputShadow = { boxShadow: '0 0 18px rgba(240,180,228,0.22)' };
const btnCls =
  'rounded-full border-2 border-[#f0b4e4]/55 bg-black/45 px-4 py-2 font-display text-sm text-[#ffd9f2] backdrop-blur-sm transition-colors hover:border-[#f0b4e4] hover:bg-[#f0b4e4]/15 disabled:opacity-60';

const Gate: React.FC = () => {
  const {
    beginJoin, requestOtp, verifyOtp, completeProfile, enableBypass,
    needsProfile, sessionEmail,
  } = useMember();
  const [pw, setPw] = useState('');
  const [denied, setDenied] = useState(false);
  const [mode, setMode] = useState<Mode>(() => (loadPendingProfile() ? 'otp' : 'join'));
  const [loginEmail, setLoginEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState(() => loadPendingProfile()?.email ?? '');
  const [pending, setPending] = useState<PendingProfile | null>(() => loadPendingProfile());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [finishFirst, setFinishFirst] = useState('');
  const [finishLast, setFinishLast] = useState('');
  const [finishPhone, setFinishPhone] = useState('');
  const grainRef = useRef<HTMLCanvasElement>(null);

  // Rare fallback: session exists but name/phone never saved (old attempts)
  useEffect(() => {
    if (!needsProfile) return;
    const p = loadPendingProfile();
    if (p?.first && p?.last) {
      setFinishFirst(p.first);
      setFinishLast(p.last);
      setFinishPhone(p.phone);
      // auto-finish when we already have the data
      void (async () => {
        setBusy(true);
        const res = await completeProfile({
          first: p.first,
          last: p.last,
          email: (sessionEmail || p.email).toLowerCase(),
          phone: p.phone,
        });
        setBusy(false);
        if (!res.ok) {
          setMode('finish');
          setErr(res.error);
        }
      })();
      return;
    }
    setMode('finish');
  }, [needsProfile, sessionEmail, completeProfile]);

  const startJoin = async (d: PendingProfile) => {
    setErr('');
    setBusy(true);
    const res = await beginJoin(d);
    setBusy(false);
    setPending(d);
    setOtpEmail(d.email);
    if (!res.ok) {
      // Rate limit: still open OTP panel so they can type a code from an earlier email.
      if (/rate limit|too many emails/i.test(res.error)) {
        setOtp('');
        setMode('otp');
        setErr(res.error);
        return;
      }
      setErr(res.error);
      throw new Error(res.error); // TrulyList keeps the form
    }
    setOtp('');
    setMode('otp');
  };

  const doLoginRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    setPending(null);
    const res = await requestOtp(loginEmail);
    setBusy(false);
    const email = loginEmail.trim().toLowerCase();
    setOtpEmail(email);
    if (!res.ok) {
      if (/rate limit|too many emails/i.test(res.error)) {
        setOtp('');
        setMode('otp');
        setErr(res.error);
        return;
      }
      setErr(res.error);
      return;
    }
    setOtp('');
    setMode('otp');
  };

  const doVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const res = await verifyOtp(otpEmail, otp);
    setBusy(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    if (!res.hasProfile) {
      const p = loadPendingProfile() || pending;
      if (p?.first && p?.last) {
        setBusy(true);
        const done = await completeProfile({
          ...p,
          email: otpEmail || p.email,
        });
        setBusy(false);
        if (!done.ok) {
          setFinishFirst(p.first);
          setFinishLast(p.last);
          setFinishPhone(p.phone);
          setMode('finish');
          setErr(done.error);
        }
        return;
      }
      setMode('finish');
      setErr('almost there — add your name to finish ♥');
    }
  };

  const doFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const email = (sessionEmail || otpEmail || pending?.email || '').trim().toLowerCase();
    if (!email) {
      setErr('missing email — join again');
      return;
    }
    if (finishFirst.trim().length < 1 || finishLast.trim().length < 1) {
      setErr('first and last name, please.');
      return;
    }
    setBusy(true);
    const res = await completeProfile({
      first: finishFirst.trim(),
      last: finishLast.trim(),
      email,
      phone: finishPhone.replace(/\D/g, ''),
    });
    setBusy(false);
    if (!res.ok) setErr(res.error);
  };

  const submitBypass = async (e: React.FormEvent) => {
    e.preventDefault();
    setDenied(false);
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/gate-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pw.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) {
        setDenied(true);
        setPw('');
        setTimeout(() => setDenied(false), 1400);
      } else {
        enableBypass();
      }
    } catch {
      setDenied(true);
      setTimeout(() => setDenied(false), 1400);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prevH = html.style.overflow, prevB = body.style.overflow;
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    return () => { html.style.overflow = prevH; body.style.overflow = prevB; };
  }, []);

  useEffect(() => {
    const cv = grainRef.current;
    if (!cv) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(max-width: 640px)').matches) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const W = (cv.width = 240), H = (cv.height = 180);
    const img = ctx.createImageData(W, H);
    let raf = 0, last = 0;
    const draw = (time: number) => {
      raf = requestAnimationFrame(draw);
      if (time - last < 70) return;
      last = time;
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 110 + Math.random() * 90;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const otpPanel = (
    <form onSubmit={doVerifyCode} className="flex flex-col items-center gap-2">
      <p className="max-w-xs text-center font-display text-[10px] uppercase tracking-[0.2em] text-[#f0b4e4]/75">
        we emailed a 6-digit code to{' '}
        <span className="text-[#ffd9f2]">{otpEmail}</span>
      </p>
      <div className="flex items-center gap-2">
        <input
          value={otp}
          onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 8)); setErr(''); }}
          placeholder="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label="Email verification code"
          className={`w-44 tracking-[0.28em] ${inputCls}`}
          style={inputShadow}
          autoFocus
        />
        <button type="submit" disabled={busy || otp.length < 6} className={btnCls} style={inputShadow}>
          {busy ? '…' : 'verify'}
        </button>
      </div>
      <button
        type="button"
        className="font-display text-[9px] uppercase tracking-[0.28em] text-[#f0b4e4]/70 hover:text-[#ffd9f2]"
        disabled={busy}
        onClick={async () => {
          setErr('');
          setBusy(true);
          const res = pending
            ? await beginJoin(pending)
            : await requestOtp(otpEmail);
          setBusy(false);
          if (!res.ok) setErr(res.error);
          else setErr('');
        }}
      >
        resend code
      </button>
      <button
        type="button"
        className="font-display text-[9px] uppercase tracking-[0.28em] text-[#f0b4e4]/70 hover:text-[#ffd9f2]"
        onClick={() => { setMode(pending ? 'join' : 'login'); setOtp(''); setErr(''); }}
      >
        back
      </button>
      <span className="min-h-4 font-whimsy text-xs text-red-300">{err}</span>
    </form>
  );

  const finishPanel = (
    <form onSubmit={doFinishProfile} className="flex flex-col items-center gap-2">
      <p className="font-whimsy text-sm text-[#ffd9f2]">one last detail</p>
      <p className="max-w-xs text-center font-display text-[10px] uppercase tracking-[0.2em] text-[#f0b4e4]/75">
        finish joining as {sessionEmail || otpEmail}
      </p>
      <div className="flex w-full max-w-xs gap-2">
        <input value={finishFirst} onChange={(e) => setFinishFirst(e.target.value)} placeholder="first name"
          aria-label="First name" className={`flex-1 ${inputCls}`} style={inputShadow} />
        <input value={finishLast} onChange={(e) => setFinishLast(e.target.value)} placeholder="last name"
          aria-label="Last name" className={`flex-1 ${inputCls}`} style={inputShadow} />
      </div>
      <input value={finishPhone} onChange={(e) => setFinishPhone(e.target.value)} placeholder="phone"
        type="tel" inputMode="tel" aria-label="Phone" className={`w-full max-w-xs ${inputCls}`} style={inputShadow} />
      <button type="submit" disabled={busy} className={btnCls} style={inputShadow}>
        {busy ? '…' : 'enter the world'}
      </button>
      <span className="min-h-4 font-whimsy text-xs text-red-300">{err}</span>
    </form>
  );

  const accessRow = (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-display text-[9px] uppercase tracking-[0.28em] text-[#ffd9f2]/90">
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'join' : 'login'); setErr(''); }}
          className={`transition-colors hover:text-[#ffd9f2] ${mode === 'login' ? 'text-[#ffd9f2]' : ''}`}>
          already a member? log in
        </button>
        <span className="text-[#f0b4e4]/40">·</span>
        <button type="button" onClick={() => { setMode(mode === 'code' ? 'join' : 'code'); setErr(''); }}
          className={`transition-colors hover:text-[#ffd9f2] ${mode === 'code' ? 'text-[#ffd9f2]' : ''}`}>
          have a code?
        </button>
      </div>

      {mode === 'login' && (
        <form onSubmit={doLoginRequest} className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <input value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setErr(''); }}
              placeholder="your email" type="email" inputMode="email" aria-label="Member email"
              className={`w-52 ${inputCls}`} style={inputShadow} />
            <button type="submit" disabled={busy} className={btnCls} style={inputShadow}>
              {busy ? '…' : 'send code'}
            </button>
          </div>
          <span className="min-h-4 font-whimsy text-xs text-red-300">{err}</span>
        </form>
      )}

      {mode === 'code' && (
        <form onSubmit={submitBypass} className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="passcode" aria-label="Passcode" autoCapitalize="characters"
              className={`w-44 tracking-[0.2em] ${inputCls} ${denied ? '!border-red-400' : ''}`}
              style={{ ...inputShadow, boxShadow: '0 0 18px rgba(240,180,228,0.22), inset 0 0 12px rgba(240,180,228,0.08)' }} />
            <button type="submit" disabled={busy} className={btnCls} style={inputShadow}>enter</button>
          </div>
          <span className="h-4 font-whimsy text-xs text-red-300">{denied ? 'not yet.' : ''}</span>
        </form>
      )}
    </div>
  );

  const card = (body: React.ReactNode) => (
    <div className="rounded-2xl border-2 border-[#f0b4e4]/45 bg-black/55 px-6 py-7 text-center backdrop-blur-sm"
      style={{ boxShadow: '0 0 26px rgba(240,180,228,0.20)' }}>
      {body}
    </div>
  );

  const mainCard = mode === 'otp' ? (
    card(
      <>
        <p className="font-whimsy text-lg text-[#f0b4e4]">{"check your email \u2665\uFE0E"}</p>
        <p className="mt-1.5 font-display text-[11px] uppercase tracking-[0.28em] text-[#f0b4e4]/70">
          enter the 6-digit code
        </p>
        <div className="mt-4 border-t border-[#f0b4e4]/20 pt-3">{otpPanel}</div>
      </>,
    )
  ) : mode === 'finish' ? (
    card(finishPanel)
  ) : (
    <TrulyList tone="dark" wide onData={startJoin} footer={accessRow} />
  );

  return (
    <>
      <div className="hidden sm:block fixed inset-0 overflow-hidden bg-[#2c3a1c]">
        <div className="film-weave absolute left-1/2 top-[33%]"
          style={{ width: STAGE_W, height: STAGE_H, backgroundColor: '#2c3a1c' }}>
          <img src="/gate/arm.jpg" alt="" className="film-flicker absolute inset-0 h-full w-full object-cover" draggable={false} />
          <Countdown className="ink-clock pointer-events-none absolute select-none whitespace-nowrap"
            style={{
              left: INK.left, top: INK.top, transform: `rotate(${INK.rotate}deg)`, transformOrigin: 'left center',
              fontFamily: "'FrankKnows', cursive", fontSize: `calc(${STAGE_W} * ${INK.size} * var(--ink-scale, 1))`,
              color: 'rgba(43,26,16,0.92)', letterSpacing: 0,
            }} />
        </div>
        <canvas ref={grainRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ mixBlendMode: 'overlay', opacity: 0.16 }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(20,10,6,0.5) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-16"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(10,8,4,0.5) 30%, rgba(10,8,4,0.88))' }}>
          <div className="w-[min(88vw,556px)]">
            {mainCard}
            {mode === 'join' && err && (
              <p className="mt-2 text-center font-whimsy text-xs text-red-300">{err}</p>
            )}
          </div>
        </div>
      </div>

      <div className="fixed inset-0 flex flex-col overflow-hidden sm:hidden"
        style={{ backgroundImage: 'url(/gate/grass.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#2c3a1c' }}>
        <div className="relative w-full shrink-0" style={{ aspectRatio: '6 / 5' }}>
          <img src="/gate/arm-mobile.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false}
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, #000 68%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, #000 68%, transparent 100%)',
            }} />
          <Countdown className="pointer-events-none absolute select-none whitespace-nowrap"
            style={{
              left: '54.4%', top: '49.2%', transform: 'rotate(4.6deg)', transformOrigin: 'left center',
              fontFamily: "'FrankKnows', cursive", fontSize: '7vw',
              color: 'rgba(43,26,16,0.94)', letterSpacing: 0,
            }} />
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col items-center gap-3 px-3 pb-10 pt-5">
            <div className="w-full max-w-[480px]">
              {mainCard}
              {mode === 'join' && err && (
                <p className="mt-2 text-center font-whimsy text-xs text-red-300">{err}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Gate;
