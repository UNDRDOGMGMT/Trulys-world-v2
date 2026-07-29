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
  try {
    const r = await fetch(LAYLO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://embed.laylo.com/' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => null);
    stored = !!(r.ok && data && data.success);
    if (!stored) {
      console.error('[subscribe] laylo did not confirm', r.status, JSON.stringify(data));
      return res.status(502).json({ ok: false, error: 'list unavailable, try again' });
    }
  } catch (err) {
    console.error('[subscribe] laylo error', err);
    return res.status(502).json({ ok: false, error: 'list unavailable, try again' });
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
