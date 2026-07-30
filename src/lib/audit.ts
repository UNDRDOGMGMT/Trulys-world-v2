import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Append-only audit trail → `audit_events`.
 * Fire-and-forget: never throws into UI, never blocks gameplay.
 */
export function audit(action: string, props?: Record<string, unknown>) {
  if (!supabaseConfigured || !action) return;
  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const member_id = session?.user?.id ?? null;
      await supabase.from('audit_events').insert({
        member_id,
        action,
        props: props ?? {},
      });
    } catch {
      /* ignore audit failures */
    }
  })();
}
