import React, { useEffect, useRef, useState } from 'react';
import { GATE_KEY } from '@/lib/gate';
import TrulyList from '@/components/TrulyList';
import { useMember } from '@/contexts/MemberContext';

/**
 * The gate (login). A 90s-film-grain photo of her arm on the grass, with the
 * launch countdown inked onto the forearm in marker — In Time style — ticking
 * down every second. Animated film grain + gate weave sell the stock.
 *
 * LAUNCH = 12:00am ET on July 31 2026 (= 9:00pm PT July 30). The offset is
 * written explicitly so it can't drift with the viewer's timezone.
 */
const LAUNCH = new Date('2026-07-31T00:00:00-04:00').getTime();
const PASSCODE = 'UNDRDOG';

// the arm photo was outpainted from 4:3 to 2400x2979 — extra grass above and
// below (456px each, symmetric) so the wordmark and the capture card get their
// own room without crowding the arm. The stage covers the viewport at the
// photo's ratio, so the countdown stays glued to the forearm on any screen.
const PHOTO_W = 2400, PHOTO_H = 2979;
// --z zooms the covering box beyond the viewport so there's vertical headroom
// to RAISE the arm (shift the stage up) without exposing an edge. It's 1 on
// desktop (landscape already has huge overhang; zooming there would only push
// the countdown off the right edge) and >1 on mobile — set in index.css. Both
// dims scale by the same --z, preserving the photo ratio and the ink alignment.
const STAGE_W = `max(calc(var(--z,1) * 100vw), calc(var(--z,1) * 100vh * ${PHOTO_W} / ${PHOTO_H}))`;
const STAGE_H = `max(calc(var(--z,1) * 100vh), calc(var(--z,1) * 100vw * ${PHOTO_H} / ${PHOTO_W}))`;
// where the ink sits on the arm (% of stage). rotate = the forearm axis,
// measured off the photo by fitting a line through the skin mask: +4.35deg,
// i.e. it DESCENDS to the right. Eyeballing it as -12 ran the numbers off the arm.
const INK = { left: '54.4%', top: '49.5%', rotate: 4.6, size: 0.0667 };

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * FrankKnows is hand-drawn, and its advance widths don't match its ink: '2'
 * advances 1097 units but its ink runs to 1507, while '3'/'8' sit inside
 * theirs. Left to the font, some digit pairs crush and others gap. So each
 * glyph gets a fixed-width cell and a nudge that centers its INK (not its
 * advance) in that cell — even rhythm, font's bouncing baseline preserved.
 * Values are (inkCenter - advance/2) / 2048, measured off the TTF.
 */
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

/**
 * The font ships no colon glyph. Drawn as two dots instead of borrowing the
 * period (whose bearings threw the spacing off): a zero-height inline-block
 * sits its bottom edge on the baseline, so the dots hang off it predictably.
 */
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

/** DD:HH:MM:SS laid out on the cell grid */
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

/** Self-contained ticking countdown — owns its own state so the per-second
 *  tick re-renders ONLY this, never the whole gate (a full-gate re-render made
 *  iOS Safari flicker the text). Positioned by the caller. */
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

const Gate: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
  const { signUp, logIn } = useMember();
  const [pw, setPw] = useState('');
  const [denied, setDenied] = useState(false);
  const [mode, setMode] = useState<'join' | 'login' | 'code'>('join');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const grainRef = useRef<HTMLCanvasElement>(null);

  // signing up (= the Laylo capture) also creates the account + unlocks the site
  const onJoined = (d: { first: string; last: string; email: string; phone: string }) => {
    try { signUp(d); } catch { /* ignore */ }
    setTimeout(onUnlock, 650); // let the "you're on the list ♥" beat land
  };

  const doLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (logIn(loginEmail)) { onUnlock(); }
    else { setLoginErr('no account for that email on this device — join above ♥'); }
  };

  // lock the document so the page itself never scrolls — on iOS Safari a
  // scrolling body toggles the address bar, which reflows the layout in a loop
  // (the "glitching back and forth"). The gate is a fixed viewport; only an
  // inner region scrolls, which does NOT move the address bar.
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prevH = html.style.overflow, prevB = body.style.overflow;
    html.style.overflow = 'hidden'; body.style.overflow = 'hidden';
    return () => { html.style.overflow = prevH; body.style.overflow = prevB; };
  }, []);

  // animated film grain — desktop only (skip the wasted rAF loop on phones)
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
      if (time - last < 70) return; // ~14fps, film-ish
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.trim().toUpperCase() === PASSCODE) {
      try { localStorage.setItem(GATE_KEY, '1'); } catch { /* ignore */ }
      onUnlock();
    } else {
      setDenied(true); setPw('');
      setTimeout(() => setDenied(false), 1400);
    }
  };

  // access row (log-in for returning members + backstage passcode), both layouts.
  // Rendered inside the TrulyList card so the links sit on the dark surface
  // instead of the grass photo (where light pink was nearly unreadable).
  const accessRow = (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-display text-[9px] uppercase tracking-[0.28em] text-[#ffd9f2]/90">
        <button type="button" onClick={() => setMode(mode === 'login' ? 'join' : 'login')}
          className={`transition-colors hover:text-[#ffd9f2] ${mode === 'login' ? 'text-[#ffd9f2]' : ''}`}>
          already a member? log in
        </button>
        <span className="text-[#f0b4e4]/40">·</span>
        <button type="button" onClick={() => setMode(mode === 'code' ? 'join' : 'code')}
          className={`transition-colors hover:text-[#ffd9f2] ${mode === 'code' ? 'text-[#ffd9f2]' : ''}`}>
          have a code?
        </button>
      </div>

      {mode === 'login' && (
        <form onSubmit={doLogin} className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <input value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginErr(''); }}
              placeholder="your email" type="email" inputMode="email" aria-label="Member email"
              className="w-52 rounded-full border-2 border-[#f0b4e4]/55 bg-black/45 px-4 py-2 text-center font-display text-sm text-[#ffd9f2] outline-none backdrop-blur-sm placeholder:text-[#f0b4e4]/45 focus:border-[#f0b4e4]"
              style={{ boxShadow: '0 0 18px rgba(240,180,228,0.22)' }} />
            <button type="submit" className="rounded-full border-2 border-[#f0b4e4]/55 bg-black/45 px-4 py-2 font-display text-sm text-[#ffd9f2] backdrop-blur-sm transition-colors hover:border-[#f0b4e4] hover:bg-[#f0b4e4]/15" style={{ boxShadow: '0 0 18px rgba(240,180,228,0.22)' }}>log in</button>
          </div>
          <span className="h-4 font-whimsy text-xs text-red-300">{loginErr}</span>
        </form>
      )}

      {mode === 'code' && (
        <form onSubmit={submit} className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="passcode" aria-label="Passcode" autoCapitalize="characters"
              className={`w-44 rounded-full border-2 bg-black/45 px-4 py-2 text-center font-display text-sm tracking-[0.2em] text-[#ffd9f2] outline-none backdrop-blur-sm transition-colors placeholder:text-[#f0b4e4]/45 ${denied ? 'border-red-400' : 'border-[#f0b4e4]/55 focus:border-[#f0b4e4]'}`}
              style={{ boxShadow: '0 0 18px rgba(240,180,228,0.22), inset 0 0 12px rgba(240,180,228,0.08)' }} />
            <button type="submit" className="rounded-full border-2 border-[#f0b4e4]/55 bg-black/45 px-4 py-2 font-display text-sm text-[#ffd9f2] backdrop-blur-sm transition-colors hover:border-[#f0b4e4] hover:bg-[#f0b4e4]/15" style={{ boxShadow: '0 0 18px rgba(240,180,228,0.22)' }}>enter</button>
          </div>
          <span className="h-4 font-whimsy text-xs text-red-300">{denied ? 'not yet.' : ''}</span>
        </form>
      )}
    </div>
  );

  // grass tone behind everything so the dark inked countdown is visible even
  // before the (multiply-blended) photo paints — no more "missing" countdown
  return (
    <>
      {/* ═══ DESKTOP: full-bleed arm, sign-up box overlaid at the bottom ═══ */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden bg-[#2c3a1c]">
        <div className="film-weave absolute left-1/2 top-[33%]"
          style={{ width: STAGE_W, height: STAGE_H, backgroundColor: '#2c3a1c' }}>
          <img src="/gate/arm.jpg" alt="" className="film-flicker absolute inset-0 h-full w-full object-cover" draggable={false} />
          <Countdown className="ink-clock pointer-events-none absolute select-none whitespace-nowrap"
            style={{
              left: INK.left, top: INK.top, transform: `rotate(${INK.rotate}deg)`, transformOrigin: 'left center',
              fontFamily: "'FrankKnows', cursive", fontSize: `calc(${STAGE_W} * ${INK.size} * var(--ink-scale, 1))`,
              // solid dark ink, NO filter/blend-mode: Safari drops a FILTERED
              // element that lives inside a transform-animated ancestor (the
              // film-weave stage), which was the "missing countdown" on web.
              color: 'rgba(43,26,16,0.92)', letterSpacing: 0,
            }} />
        </div>
        <canvas ref={grainRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ mixBlendMode: 'overlay', opacity: 0.16 }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(20,10,6,0.5) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-16"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(10,8,4,0.5) 30%, rgba(10,8,4,0.88))' }}>
          <div className="w-[min(88vw,556px)]">
            <TrulyList tone="dark" wide onData={onJoined} footer={accessRow} />
          </div>
        </div>
      </div>

      {/* ═══ MOBILE: fixed viewport (page can't scroll → no address-bar toggle,
          no jitter). Arm band pinned on top; ONLY the sign-up region scrolls,
          with overscroll containment so it never bubbles to the body. The whole
          thing carries grass, so the box floats on it with no dark panel. */}
      <div className="fixed inset-0 flex flex-col overflow-hidden sm:hidden"
        style={{ backgroundImage: 'url(/gate/grass.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#2c3a1c' }}>
        <div className="relative w-full shrink-0" style={{ aspectRatio: '6 / 5' }}>
          {/* fade the band's bottom edge into the page grass so the two grass
              crops blend instead of meeting at a hard line */}
          <img src="/gate/arm-mobile.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false}
            style={{
              WebkitMaskImage: 'linear-gradient(to bottom, #000 68%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, #000 68%, transparent 100%)',
            }} />
          <Countdown className="pointer-events-none absolute select-none whitespace-nowrap"
            style={{
              left: '54.4%', top: '49.2%', transform: 'rotate(4.6deg)', transformOrigin: 'left center',
              fontFamily: "'FrankKnows', cursive", fontSize: '7vw',
              // solid dark ink — no mix-blend-mode (iOS Safari drops it)
              color: 'rgba(43,26,16,0.94)', letterSpacing: 0,
            }} />
        </div>
        {/* only this region scrolls; grass shows through so the box floats on it */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex flex-col items-center gap-3 px-3 pb-10 pt-5">
            <div className="w-full max-w-[480px]">
              <TrulyList tone="dark" wide onData={onJoined} footer={accessRow} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Gate;
