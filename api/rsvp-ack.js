/**
 * Truls's World — RSVP auto-confirmation ("your RSVP is pending") to the fan.
 *
 * Vercel serverless function. The /rsvp form posts { name, email, guests } here
 * and this emails the submitter an acknowledgement FROM hi@trulys.world via
 * Resend. This is additive + best-effort: the RSVP itself already succeeds via
 * the team email + Supabase record, so if Resend isn't configured yet (no
 * RESEND_API_KEY, or the domain isn't verified) this simply no-ops.
 *
 * Setup to turn it on:
 *   1. Create a free Resend account, add + verify the trulys.world domain
 *      (paste the DNS records Resend gives you into GoDaddy).
 *   2. Create an API key → set RESEND_API_KEY in Vercel (Production).
 * Optional: RSVP_FROM overrides the from address (default hi@trulys.world).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FROM = process.env.RSVP_FROM || "Truly's World <hi@trulys.world>";
const REPLY_TO = 'hi@trulys.world';

function ackHtml(name, guests) {
  const hi = name ? `Hi ${name},` : 'Hi,';
  const party = Number(guests) > 0 ? ` (+${Number(guests)})` : '';
  return `<!doctype html><html><body style="margin:0;background:#0a0208;color:#f6e9f2;font-family:Georgia,'Times New Roman',serif;">
    <div style="max-width:520px;margin:0 auto;padding:32px 26px;">
      <div style="text-align:center;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#ff8fce;">✦ Truly's World ✦</div>
      <h1 style="text-align:center;font-size:30px;line-height:1.1;color:#ff5fb0;margin:14px 0 6px;">Your RSVP is pending</h1>
      <p style="text-align:center;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#e9b8dd;margin:0 0 22px;">Truly Young — Live · Aug 8 · 8PM · Sunset Blvd</p>
      <p style="font-size:15px;line-height:1.6;color:#f0dcea;">${hi}</p>
      <p style="font-size:15px;line-height:1.6;color:#f0dcea;">We got your RSVP${party} — thank you ♥ It's <strong style="color:#ff8fce;">pending</strong> right now. Every RSVP is approved by hand, so keep an eye on your inbox: if you're in, you'll get an <strong>approved confirmation email with the venue address</strong> later this week.</p>
      <p style="font-size:15px;line-height:1.6;color:#f0dcea;">See you on Sunset ♥</p>
      <p style="font-size:14px;line-height:1.6;color:#c9a7c0;margin-top:22px;">— Truly's World</p>
      <div style="border-top:1px solid rgba(255,143,206,0.25);margin-top:26px;padding-top:14px;text-align:center;font-size:11px;color:#8f7a89;">You're receiving this because you RSVP'd at trulys.world. Reply to this email with any questions.</div>
    </div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }
  if (Number(req.headers['content-length'] || 0) > 10_000) {
    return res.status(413).json({ ok: false, error: 'too large' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const name = String(body?.name ?? '').trim().slice(0, 120);
  const email = String(body?.email ?? '').trim();
  const guests = Math.max(0, Math.min(10, parseInt(body?.guests, 10) || 0));
  if (!EMAIL_RE.test(email)) return res.status(400).json({ ok: false, error: 'valid email required' });

  const KEY = process.env.RESEND_API_KEY;
  // Not configured yet → no-op so the RSVP flow is never blocked.
  if (!KEY) return res.status(200).json({ ok: false, sent: false, reason: 'resend not configured' });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        reply_to: REPLY_TO,
        subject: 'Your RSVP is pending ♥ — Truly Young Live',
        html: ackHtml(name, guests),
      }),
      signal: ac.signal,
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      console.error('[rsvp-ack] resend error', r.status, JSON.stringify(data));
      return res.status(502).json({ ok: false, sent: false });
    }
    return res.status(200).json({ ok: true, sent: true });
  } catch (err) {
    console.error('[rsvp-ack] error', err?.name === 'AbortError' ? 'timeout' : err);
    return res.status(502).json({ ok: false, sent: false });
  } finally {
    clearTimeout(timer);
  }
}
