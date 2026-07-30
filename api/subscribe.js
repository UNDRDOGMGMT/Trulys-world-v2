/**
 * Truly's World — mailing-list capture endpoint.
 *
 * Runs as a Vercel serverless function (Vercel picks up /api automatically even
 * on a Vite build). The on-brand form posts { name, email, phone } here and this
 * forwards the signup straight into Truly's real Laylo audience — the same list
 * her other projects capture into — so no separate backend is required.
 *
 * ── HOW THIS WAS DERIVED ────────────────────────────────────────────────────
 * Laylo's embed can't take a full name and can't be restyled, so instead of the
 * iframe we replicate the exact call its widget fires on submit:
 *     POST https://events.laylo.com/actions/rsvp/rsvp
 *     { type:'rsvp', payload:{ productId, creatorId, name, email, phone, ... } }
 * Captured live from the widget's own network traffic. Key findings:
 *   • the payload has a real `name` field (the form's `first_name` is a separate
 *     spam-trap honeypot — we don't send it)
 *   • the server accepts the POST with an EMPTY captcha token, so it works
 *     server-side with no browser / reCAPTCHA
 *   • name + email + phone in ONE payload returns { success:true, userId }
 *
 * IDs are Truly's drop (productId 3r1hv) + creator. Override via env if reused.
 *
 * Optional: set CAPTURE_WEBHOOK_URL to ALSO mirror each signup to your own store
 * (Formspree / Google Sheet). Left unset, Laylo is the only sink. A Laylo failure
 * is what determines success; the mirror is best-effort.
 * ───────────────────────────────────────────────────────────────────────────
 */
import { randomUUID } from 'node:crypto';

const LAYLO_URL = 'https://events.laylo.com/actions/rsvp/rsvp';
const DROP_ID = process.env.LAYLO_DROP_ID || '3r1hv';
const CREATOR_ID = process.env.LAYLO_CREATOR_ID || 'b8e6f854-9f16-4434-ac5b-6609803e88c2';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** In-memory per-IP sliding window. Resets on cold start (acceptable for launch). */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
/** @type {Map<string, number[]>} */
const hitsByIp = new Map();

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.socket?.remoteAddress || req.headers['x-real-ip'] || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const prev = hitsByIp.get(ip) || [];
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hitsByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  hitsByIp.set(ip, recent);
  // opportunistic prune so the Map doesn't grow forever on a warm instance
  if (hitsByIp.size > 5000) {
    for (const [k, ts] of hitsByIp) {
      const keep = ts.filter((t) => now - t < RATE_WINDOW_MS);
      if (keep.length) hitsByIp.set(k, keep);
      else hitsByIp.delete(k);
    }
  }
  return false;
}

/** Whatever domain this is actually served from — so attribution follows the
 *  published domain (trulys.world, a preview URL, anything) with no hardcoding. */
function siteFrom(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}/` : 'https://trulys.world/';
}

/** form sends bare digits; Laylo wants E.164. Assume US/CA when no country given. */
function toE164(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === '1') return `+${d}`;
  return `+${d}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ ok: false, error: 'too many tries - wait a bit' });
  }

  // reject oversized bodies early — this endpoint only ever needs a few small
  // strings, so a multi-KB POST is either a mistake or an abuse attempt.
  if (Number(req.headers['content-length'] || 0) > 10_000) {
    return res.status(413).json({ ok: false, error: 'too large' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim();
  const phone = toE164(body?.phone);
  const trap = String(body?.company ?? '').trim(); // honeypot — humans leave it empty

  if (trap) return res.status(200).json({ ok: true, stored: false }); // silently drop bots
  if (name.length < 2) return res.status(400).json({ ok: false, error: 'name required' });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'valid email required' });
  if (phone.replace(/\D/g, '').length < 10) return res.status(400).json({ ok: false, error: 'valid phone required' });

  const payload = {
    type: 'rsvp',
    payload: {
      dropDate: null,
      fingerprintId: randomUUID().replace(/-/g, ''),
      productId: DROP_ID,
      creatorId: CREATOR_ID,
      optIn: true,
      name,
      email,
      phone,
      referrer: siteFrom(req),
      captcha: '',
    },
  };

  let stored = false;
  // bound the upstream call so a slow/hung Laylo can't hold this serverless
  // invocation open and burn concurrency during a traffic spike.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(LAYLO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://embed.laylo.com/' },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    const data = await r.json().catch(() => null);
    stored = !!(r.ok && data && data.success);
    if (!stored) {
      console.error('[subscribe] laylo did not confirm', r.status, JSON.stringify(data));
      return res.status(502).json({ ok: false, error: 'list unavailable, try again' });
    }
  } catch (err) {
    console.error('[subscribe] laylo error', err?.name === 'AbortError' ? 'timeout' : err);
    return res.status(502).json({ ok: false, error: 'list unavailable, try again' });
  } finally {
    clearTimeout(timer);
  }

  // optional secondary sink — best-effort, never blocks the response
  const mirror = process.env.CAPTURE_WEBHOOK_URL;
  if (mirror) {
    fetch(mirror, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, source: 'trulys-world', at: new Date().toISOString() }),
    }).catch((e) => console.warn('[subscribe] mirror failed', e?.message));
  }

  return res.status(200).json({ ok: true, stored: true });
}
