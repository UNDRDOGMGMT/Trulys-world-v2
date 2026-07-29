// Lean clean-room stub. The production site ships Vercel Analytics + Clarity;
// this v2 keeps the same trackEvent() call sites so components port cleanly,
// but the events are no-ops (logged in dev only). Wire a real sink here later.
export function trackEvent(event: string, props?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(`[track] ${event}`, props ?? {});
  }
}
