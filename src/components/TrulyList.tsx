import React, { useState } from 'react';

/**
 * Truly's World mailing-list capture — first/last name + email + phone, styled
 * to the site rather than an embedded third-party widget. Posts to /api/subscribe.
 *
 * `tone` picks the surface treatment. `wide` switches to the horizontal gate
 * layout — a large wordmark on the left, the form on the right — and collapses
 * back to a stacked column on phones. `logo` shows the wordmark in the stacked
 * layout (used on the gate's mobile view / non-wide surfaces).
 */
type Tone = 'dark' | 'plate';
const PINK = '#f0b4e4', PINK_TEXT = '#ffd9f2';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const digits = (s: string) => s.replace(/\D/g, '');
const prettyPhone = (s: string) => {
  const d = digits(s).slice(0, 11);
  const n = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
  if (n.length <= 3) return n;
  if (n.length <= 6) return `(${n.slice(0, 3)}) ${n.slice(3)}`;
  return `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6, 10)}`;
};

const TrulyList: React.FC<{
  tone?: Tone; logo?: boolean; wide?: boolean;
  /** Extra content rendered inside the card (e.g. gate login / passcode links). */
  footer?: React.ReactNode;
  onDone?: (d: { first: string; last: string; email: string; phone: string }) => void;
  // Called after validation, before Laylo. May be async; throw/reject to keep the form.
  onData?: (d: { first: string; last: string; email: string; phone: string }) => void | Promise<void>;
}> = ({ tone = 'dark', logo = false, wide = false, footer, onDone, onData }) => {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState(''); // honeypot — real humans never see it
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const setErr = (m: string) => { setState('error'); setMsg(m); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;
    if (first.trim().length < 1 || last.trim().length < 1) return setErr('first and last name, please.');
    if (!EMAIL_RE.test(email.trim())) return setErr('need a real email.');
    if (digits(phone).length < 10) return setErr('need a full phone number.');
    const captured = { first: first.trim(), last: last.trim(), email: email.trim(), phone: digits(phone) };
    setState('sending'); setMsg('');
    // Auth / account handoff first — if this fails we keep the form (don't show "you're on the list").
    try {
      await Promise.resolve(onData?.(captured));
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setErr(!raw || raw === '{}' || raw === '[object Object]'
        ? 'could not start signup — check auth settings and try again'
        : raw);
      return;
    }
    // When the gate owns the next step (OTP), don't block or flip this card to
    // error/done — Laylo is best-effort in the background.
    if (onData) {
      void fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first: first.trim(), last: last.trim(), name: `${first.trim()} ${last.trim()}`,
          email: email.trim(), phone: digits(phone), company,
        }),
      }).catch(() => { /* ignore */ });
      return;
    }
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first: first.trim(), last: last.trim(), name: `${first.trim()} ${last.trim()}`,
          email: email.trim(), phone: digits(phone), company,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok) throw new Error(data.error || 'something broke');
      setState('done'); onDone?.({ first: first.trim(), last: last.trim(), email: email.trim(), phone: digits(phone) });
    } catch (err) {
      setErr(err instanceof Error ? err.message : 'something broke');
    }
  };

  const surface = tone === 'plate' ? 'bg-black/45 border-[#f0b4e4]/35' : 'bg-black/55 border-[#f0b4e4]/45';
  const shadow = { boxShadow: '0 0 26px rgba(240,180,228,0.20)' };

  if (state === 'done') {
    return (
      <div className={`rounded-2xl border-2 ${surface} px-6 py-7 text-center backdrop-blur-sm`} style={shadow}>
        <p className="font-whimsy text-lg" style={{ color: PINK }}>{"you\u2019re on the list \u2665\uFE0E"}</p>
        <p className="mt-1.5 font-display text-[11px] uppercase tracking-[0.28em] text-[#f0b4e4]/70">
          SEE YA REAL SOON :)
        </p>
        {footer && <div className="mt-4 border-t border-[#f0b4e4]/20 pt-3">{footer}</div>}
      </div>
    );
  }

  const inputCls =
    'w-full rounded-full border-2 bg-black/45 px-4 py-1.5 sm:py-2.5 text-center font-display text-sm tracking-[0.12em] ' +
    'text-[#ffd9f2] outline-none backdrop-blur-sm transition-colors placeholder:text-[#f0b4e4]/45 ' +
    'border-[#f0b4e4]/40 focus:border-[#f0b4e4]';
  const inStyle = { boxShadow: 'inset 0 0 12px rgba(240,180,228,0.06)' };

  // the fields, shared by both layouts: first+last on one line, then email, phone, button
  const fields = (
    <>
      <div className="flex gap-2">
        <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="first name"
          aria-label="First name" autoComplete="given-name" className={inputCls} style={inStyle} />
        <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="last name"
          aria-label="Last name" autoComplete="family-name" className={inputCls} style={inStyle} />
      </div>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email"
        type="email" inputMode="email" aria-label="Email" autoComplete="email" className={inputCls} style={inStyle} />
      <input value={phone} onChange={(e) => setPhone(prettyPhone(e.target.value))} placeholder="phone"
        type="tel" inputMode="tel" aria-label="Phone" autoComplete="tel" className={inputCls} style={inStyle} />
      {/* honeypot — hidden from humans, catches bots */}
      <input value={company} onChange={(e) => setCompany(e.target.value)} name="company" tabIndex={-1}
        autoComplete="off" aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }} />
      <button type="submit" disabled={state === 'sending'}
        className="mt-0.5 rounded-full border-2 border-[#f0b4e4]/55 bg-[#f0b4e4]/12 px-4 py-1.5 sm:py-2.5 font-display text-sm uppercase tracking-[0.2em] text-[#ffd9f2] backdrop-blur-sm transition-colors hover:border-[#f0b4e4] hover:bg-[#f0b4e4]/22 disabled:opacity-60"
        style={{ boxShadow: '0 0 18px rgba(240,180,228,0.22)' }}>
        {state === 'sending' ? 'entering…' : <>enter the list <span style={{ color: PINK }}>{'\u2665\uFE0E'}</span></>}
      </button>
      <span className="min-h-[1rem] text-center font-sans text-[11px] leading-snug" style={{ color: '#ffb3d1' }}>
        {state === 'error' ? msg : ''}
      </span>
    </>
  );

  const consent = (
    <p className="mt-1.5 text-center font-sans text-[8.5px] leading-[1.45] text-[#f0b4e4]/45"
      style={{ fontFamily: 'system-ui, sans-serif' }}>
      By entering you agree to receive recurring automated marketing texts &amp; emails from
      Truly&rsquo;s World. Msg frequency varies. Msg &amp; data rates may apply. Reply STOP to
      cancel, HELP for help. See{' '}
      <a href="https://laylo.com/terms" target="_blank" rel="noreferrer" className="underline hover:text-[#f0b4e4]/80">Terms</a>{' '}&amp;{' '}
      <a href="https://laylo.com/privacy" target="_blank" rel="noreferrer" className="underline hover:text-[#f0b4e4]/80">Privacy</a>.
    </p>
  );

  const Wordmark: React.FC<{ className: string }> = ({ className }) => (
    <img src="/brand/tw-wordmark.png" alt="Truly's World" className={`${className} h-auto select-none`} draggable={false}
      style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7)) drop-shadow(0 0 16px rgba(240,180,228,0.4))' }} />
  );

  // ── horizontal gate layout: big wordmark left, form right (stacks on phones) ──
  if (wide) {
    return (
      <div className={`rounded-2xl border-2 ${surface} px-4 py-3 sm:px-6 sm:py-5 backdrop-blur-sm`} style={shadow}>
        <form onSubmit={submit}>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:gap-6">
            <div className="shrink-0 text-center sm:w-[196px]">
              <Wordmark className="mx-auto w-[min(38%,140px)] sm:w-full" />
              <p className="mt-1 hidden font-display text-[10px] uppercase tracking-[0.26em] text-[#f0b4e4]/60 sm:block">
                sign up for all things Truly's World
              </p>
            </div>
            <div className="flex w-full flex-1 flex-col gap-2 sm:gap-2.5">
              {fields}
            </div>
          </div>
          {consent}
        </form>
        {footer && <div className="mt-3 border-t border-[#f0b4e4]/20 pt-3">{footer}</div>}
      </div>
    );
  }

  // ── stacked layout (LAX case file, or logo-topped column) ──
  return (
    <div className={`rounded-2xl border-2 ${surface} px-5 py-5 backdrop-blur-sm`} style={shadow}>
      <form onSubmit={submit} className="flex flex-col gap-2.5">
        {logo ? (
          <div className="mb-1 text-center">
            <Wordmark className="mx-auto w-[min(58%,196px)]" />
            <p className="mt-0.5 font-display text-[9px] uppercase tracking-[0.3em] text-[#f0b4e4]/55">
              sign up for all things Truly's World
            </p>
          </div>
        ) : (
          <div className="mb-0.5 text-center">
            <p className="font-display text-[12px] uppercase tracking-[0.24em]" style={{ color: PINK_TEXT }}>
              sign up for all things Truly's World
            </p>
            <p className="mt-1 font-display text-[9px] uppercase tracking-[0.3em] text-[#f0b4e4]/55">
              the drop, the merch, the shows — before the algorithm decides
            </p>
          </div>
        )}
        {fields}
        {consent}
      </form>
      {footer && <div className="mt-3 border-t border-[#f0b4e4]/20 pt-3">{footer}</div>}
    </div>
  );
};

export default TrulyList;
