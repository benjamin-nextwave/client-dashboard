'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Subscribe to Supabase Realtime changes on synced_leads for this client.
 * When a positive lead is inserted or updated, triggers a router.refresh()
 * so the server component re-fetches fresh data.
 */
export function useInboxRealtime(clientId: string) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`inbox-realtime-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'synced_leads',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          // Refresh when a positive lead is inserted/updated
          const newRecord = payload.new as Record<string, unknown> | undefined
          if (newRecord?.interest_status === 'positive') {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, router])
}

/**
 * Subscribe to Supabase Realtime changes on cached_emails for a specific lead.
 * When new emails arrive for this lead, triggers a router.refresh().
 */
export function useThreadRealtime(clientId: string, leadEmail: string) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`thread-realtime-${clientId}-${leadEmail}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cached_emails',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown> | undefined
          if (newRecord?.lead_email === leadEmail) {
            router.refresh()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId, leadEmail, router])
}
