'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Dismiss a news item for the currently-authenticated user.
 *
 * Security notes (per Phase 10 threat model):
 * - user_id is read SERVER-SIDE from the auth session — NEVER accepted from the
 *   caller. This defends against T-1 (cross-user dismissal forgery): a malicious
 *   client cannot pass another user's id even via DevTools.
 * - This uses the REQUEST-SCOPED supabase client (createClient), NOT the admin
 *   client. RLS WITH CHECK (user_id = auth.uid()) on the dismissals table is
 *   the backstop — even if the auth read above were bypassed, RLS rejects any
 *   INSERT where user_id != auth.uid().
 * - upsert with the composite PK as conflict target makes the action idempotent
 *   on double-click — duplicate inserts are silently ignored.
 * - We deliberately do NOT trigger a path revalidation. Queue state in the
 *   overlay is client-managed during the session; the next /dashboard render
 *   naturally re-queries the join and excludes any newly-dismissed items.
 */
export async function dismissNewsItem(
  newsItemId: string
): Promise<{ ok: true } | { error: string }> {
  // Defensive input check — RLS would reject malformed UUIDs anyway, but a clean
  // early return gives a deterministic error message.
  if (typeof newsItemId !== 'string' || newsItemId.length === 0) {
    return { error: 'invalid id' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthenticated' }

  const { error } = await supabase
    .from('news_dismissals')
    .upsert(
      { user_id: user.id, news_item_id: newsItemId },
      { onConflict: 'user_id,news_item_id', ignoreDuplicates: true }
    )

  if (error) return { error: error.message }
  return { ok: true }
}
