'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Invisible component that triggers an on-demand sync when the client
 * visits their dashboard. If the sync returns new data, it refreshes
 * the page so the user sees updated stats without manual reload.
 */
export function BackgroundSync() {
  const router = useRouter()
  const triggered = useRef(false)

  useEffect(() => {
    if (triggered.current) return
    triggered.current = true

    fetch('/api/sync-client', { method: 'POST' })
      .then((res) => res.json())
      .then(() => {
        // Always refresh to show latest data, even if sync was skipped
        router.refresh()
      })
      .catch(() => {
        // Non-critical — cron will pick it up
      })
  }, [router])

  return null
}
