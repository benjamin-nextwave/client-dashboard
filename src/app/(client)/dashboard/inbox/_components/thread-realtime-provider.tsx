'use client'

import { useThreadRealtime } from '@/hooks/use-inbox-realtime'

/**
 * Thin client component that activates Supabase Realtime
 * for a specific lead's email thread. Renders nothing — just runs the hook.
 */
export function ThreadRealtimeProvider({
  clientId,
  leadEmail,
}: {
  clientId: string
  leadEmail: string
}) {
  useThreadRealtime(clientId, leadEmail)
  return null
}
