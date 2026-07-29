// Lean clean-room stub. The production site ships Vercel Analytics + Clarity;
// this v2 keeps the same trackEvent() call sites so components port cleanly,
// but the events are no-ops (logged in dev only). Wire a real sink here later.
//
// It also doubles as the POINTS BRIDGE for membership: MemberContext registers
// an award hook, and the gameplay/exploration events that already fire around
// the site turn into Truly's World points (de-duped per game inside the hook).

type AwardHook = (game: string, label: string, points: number) => void;
let awardHook: AwardHook | null = null;
export function setAwardHook(fn: AwardHook | null) { awardHook = fn; }

// Which events earn points, and how much. De-duped by a stable id so a given
// game/hood only scores once per member.
const POINTS: Record<string, { pts: number; verb: string; key: string }> = {
  game_launch:  { pts: 75, verb: 'Played',   key: 'to' },
  pov_action:   { pts: 40, verb: 'Unlocked', key: 'to' },
  travel:       { pts: 25, verb: 'Explored', key: 'location' },
  location_cta: { pts: 20, verb: 'Visited',  key: 'location' },
};

// "/save-truly" or "silverlake" → "Save Truly"
const pretty = (s: string) =>
  String(s).replace(/^\//, '').replace(/[-_/]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[track] ${event}`, props ?? {});
  }
  const rule = POINTS[event];
  if (rule && awardHook) {
    const raw = String(props?.[rule.key] ?? event);
    try { awardHook(`${event}:${raw}`, `${rule.verb} ${pretty(raw)}`, rule.pts); } catch { /* ignore */ }
  }
}
