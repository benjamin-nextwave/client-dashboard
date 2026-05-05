'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  moveLeadToTrash,
  permanentlyDeleteLead,
  restoreLeadFromTrash,
} from '../_lib/actions'

export function LeadActions({
  leadId,
  isTrashed,
}: {
  leadId: string
  isTrashed: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handle(action: 'trash' | 'restore' | 'permanent') {
    setError(null)
    if (action === 'permanent' && !confirm('Lead definitief verwijderen? Dit kan niet ongedaan gemaakt worden.')) {
      return
    }
    startTransition(async () => {
      const res =
        action === 'trash'
          ? await moveLeadToTrash(leadId)
          : action === 'restore'
            ? await restoreLeadFromTrash(leadId)
            : await permanentlyDeleteLead(leadId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      // Na trash/permanent: terug naar lijst.
      if (action !== 'restore') {
        router.push(action === 'permanent' ? '/dashboard/lead-inbox?view=trash' : '/dashboard/lead-inbox')
      } else {
        router.push('/dashboard/lead-inbox')
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isTrashed ? (
        <>
          <button
            type="button"
            onClick={() => handle('restore')}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Herstellen
          </button>
          <button
            type="button"
            onClick={() => handle('permanent')}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79M19.228 5.79a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Definitief verwijderen
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => handle('trash')}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
          </svg>
          Naar prullenbak
        </button>
      )}
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  )
}
