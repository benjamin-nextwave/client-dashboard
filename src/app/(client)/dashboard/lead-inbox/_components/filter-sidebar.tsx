'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LeadWithStatus, LeadClassification } from '../_lib/types'
import { CLASSIFICATION_LABEL } from '../_lib/labels'

// "not_interested" wordt bewust niet als filter getoond.
const CATEGORIES: LeadClassification[] = [
  'meeting_request',
  'phone_request',
  'interested',
  'referral',
  'internal_review',
  'not_now_maybe_later',
]

export function FilterSidebar({ leads }: { leads: LeadWithStatus[] }) {
  const params = useSearchParams()
  const active = params.get('classification')

  const inboxCount = leads.filter((l) => l.awaitingOurReply).length

  const folderCounts = CATEGORIES.reduce<Record<LeadClassification, number>>(
    (acc, cat) => {
      acc[cat] = leads.filter(
        (l) => l.classification === cat && !l.awaitingOurReply
      ).length
      return acc
    },
    {} as Record<LeadClassification, number>
  )

  function itemClasses(isActive: boolean) {
    return [
      'flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
      isActive
        ? 'bg-[var(--color-brand)] text-white'
        : 'text-gray-700 hover:bg-gray-100',
    ].join(' ')
  }

  return (
    <nav className="flex flex-col gap-1 p-3">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Inbox
      </p>
      <Link href="/dashboard/lead-inbox" className={itemClasses(!active)}>
        <span className="font-medium">Alle</span>
        <span className={!active ? 'text-white/80 text-xs' : 'text-gray-500 text-xs'}>
          {inboxCount}
        </span>
      </Link>
      <p className="mt-3 px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        Beantwoord
      </p>
      {CATEGORIES.map((cat) => {
        const isActive = active === cat
        return (
          <Link
            key={cat}
            href={`/dashboard/lead-inbox?classification=${cat}`}
            className={itemClasses(isActive)}
          >
            <span className="truncate">{CLASSIFICATION_LABEL[cat]}</span>
            <span
              className={
                isActive
                  ? 'ml-2 shrink-0 text-white/80 text-xs'
                  : 'ml-2 shrink-0 text-gray-500 text-xs'
              }
            >
              {folderCounts[cat]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
