'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LeadWithStatus, LeadClassification } from '../_lib/types'
import { CLASSIFICATION_LABEL } from '../_lib/labels'

const CATEGORIES: LeadClassification[] = [
  'meeting_request',
  'phone_request',
  'interested',
  'referral',
  'internal_review',
  'not_now_maybe_later',
]

export function FilterChips({ leads }: { leads: LeadWithStatus[] }) {
  const params = useSearchParams()
  const active = params.get('classification')
  const isTrash = params.get('view') === 'trash'

  const activeLeads = leads.filter((l) => !l.deleted_at)
  const trashedLeads = leads.filter((l) => l.deleted_at)
  const inboxCount = activeLeads.filter((l) => l.awaitingOurReply).length

  function chipClasses(isActive: boolean) {
    return [
      'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
      isActive
        ? 'bg-[var(--color-brand)] text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ].join(' ')
  }

  const noFilterActive = !active && !isTrash

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3">
      <Link href="/dashboard/lead-inbox" className={chipClasses(noFilterActive)}>
        Alle ({inboxCount})
      </Link>
      {CATEGORIES.map((cat) => {
        const count = activeLeads.filter(
          (l) => l.classification === cat && !l.awaitingOurReply
        ).length
        const isActive = active === cat && !isTrash
        return (
          <Link
            key={cat}
            href={`/dashboard/lead-inbox?classification=${cat}`}
            className={chipClasses(isActive)}
          >
            {CLASSIFICATION_LABEL[cat]} ({count})
          </Link>
        )
      })}
      <Link href="/dashboard/lead-inbox?view=trash" className={chipClasses(isTrash)}>
        Prullenbak ({trashedLeads.length})
      </Link>
    </div>
  )
}
