/**
 * Staff gate bypass — validates GATE_BYPASS_CODE server-side so the passcode
 * never ships in the client bundle. Returns { ok: true } on match.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  // Two independently-rotatable codes: the staff code (GATE_BYPASS_CODE) and a
  // shareable demo code (GATE_DEMO_CODE) for label/press walkthroughs. Either
  // env may also hold a comma-separated list.
  const expected = [process.env.GATE_BYPASS_CODE, process.env.GATE_DEMO_CODE]
    .flatMap((v) => String(v || '').split(','))
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);
  if (!expected.length) {
    // Not configured on this deployment — no code will work until the env is set.
    return res.status(503).json({ ok: false, error: 'bypass not configured — set GATE_BYPASS_CODE on Vercel' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const code = String(body?.code ?? '').trim();
  if (!code || !expected.includes(code.toUpperCase())) {
    return res.status(401).json({ ok: false, error: 'invalid code' });
  }

  return res.status(200).json({ ok: true });
}
