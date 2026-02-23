'use client'

import { useInboxRealtime } from '@/hooks/use-inbox-realtime'

/**
 * Thin client component that activates Supabase Realtime
 * for the inbox. Renders nothing — just runs the hook.
 */
export function InboxRealtimeProvider({ clientId }: { clientId: string }) {
  useInboxRealtime(clientId)
  return null
}
