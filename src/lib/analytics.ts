// Vercel Analytics + membership points bridge + audit trail.
// trackEvent() call sites stay stable; gameplay events also award points via
// the MemberContext award hook and write to audit_events.

import { track } from "@vercel/analytics";
import { audit } from "@/lib/audit";

type AwardHook = (game: string, label: string, points: number) => void;
let awardHook: AwardHook | null = null;
export function setAwardHook(fn: AwardHook | null) { awardHook = fn; }

const POINTS: Record<string, { pts: number; verb: string; key: string }> = {
  game_launch:  { pts: 75, verb: "Played",   key: "to" },
  pov_action:   { pts: 40, verb: "Unlocked", key: "to" },
  travel:       { pts: 25, verb: "Explored", key: "location" },
  location_cta: { pts: 20, verb: "Visited",  key: "location" },
};

const pretty = (s: string) =>
  String(s).replace(/^\//, "").replace(/[-_/]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();

export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[track] ${event}`, props ?? {});
  }
  try {
    track(event, props as Record<string, string | number | boolean | null> | undefined);
  } catch { /* ignore analytics failures */ }

  audit(event, props);

  const rule = POINTS[event];
  if (rule && awardHook) {
    const raw = String(props?.[rule.key] ?? event);
    try { awardHook(`${event}:${raw}`, `${rule.verb} ${pretty(raw)}`, rule.pts); } catch { /* ignore */ }
  }
}
