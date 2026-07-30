/**
 * Versioned so a gate redesign re-shows for people who already unlocked the
 * old one — their stored 'tw-gate' no longer matches, so they see the new gate.
 * Bump the suffix whenever the gate changes and everyone should see it.
 *
 * Real unlock is driven by Supabase session (+ member profile) or a
 * server-validated staff bypass. These keys are only helpers / legacy cleanup.
 */
export const GATE_KEY = 'tw-gate-2';
/** Set only after POST /api/gate-bypass succeeds — never trust a client-typed code. */
export const BYPASS_KEY = 'tw-gate-bypass';
