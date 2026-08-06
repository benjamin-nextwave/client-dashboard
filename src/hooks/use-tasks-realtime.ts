'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ControlePersona } from '@/lib/data/controle'

/**
 * Subscribe to Supabase Realtime changes on operator_check_tasks for one
 * persona. Any insert/update/delete (from this dashboard OR from an external
 * project sharing the same table) triggers a router.refresh() so the server
 * component re-fetches the fresh task list.
 *
 * De filter op assignee werkt voor INSERT/UPDATE/DELETE omdat de migratie
 * REPLICA IDENTITY FULL zet (oude rij komt mee in het event-payload).
 */
export function useTasksRealtime(persona: ControlePersona) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`tasks-realtime-${persona}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'operator_check_tasks',
          filter: `assignee=eq.${persona}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [persona, router])
}
