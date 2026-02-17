'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { archiveLead, unarchiveLead } from '@/lib/actions/inbox-actions'

interface ArchiveButtonProps {
  leadId: string
  isArchived: boolean
}

export function ArchiveButton({ leadId, isArchived }: ArchiveButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    startTransition(async () => {
      if (isArchived) {
        await unarchiveLead(leadId)
      } else {
        await archiveLead(leadId)
      }
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
        isPending ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        isArchived
          ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {isArchived ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          Verplaats naar Inbox
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Verplaats naar Afgehandeld
        </>
      )}
    </button>
  )
}
