'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LeadWithStatus, LeadClassification } from '../_lib/types'
import { CLASSIFICATION_DOT, CLASSIFICATION_LABEL } from '../_lib/labels'

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
  const view = params.get('view')
  const isTrash = view === 'trash'

  const activeLeads = leads.filter((l) => !l.deleted_at)
  const trashedLeads = leads.filter((l) => l.deleted_at)

  const inboxCount = activeLeads.filter((l) => l.awaitingOurReply).length

  const folderCounts = CATEGORIES.reduce<Record<LeadClassification, number>>(
    (acc, cat) => {
      acc[cat] = activeLeads.filter(
        (l) => l.classification === cat && !l.awaitingOurReply
      ).length
      return acc
    },
    {} as Record<LeadClassification, number>
  )

  function itemClasses(isActive: boolean) {
    return [
      'flex items-center justify-between rounded-control px-3 py-[7px] text-[12.5px] transition-colors',
      isActive
        ? 'bg-[var(--brand-12)] font-semibold text-brand-ink'
        : 'text-muted hover:bg-[var(--brand-07)] hover:text-fg',
    ].join(' ')
  }

  function countClasses(isActive: boolean) {
    return isActive
      ? 'ml-2 shrink-0 text-[11px] tabular-nums text-brand-ink/70'
      : 'ml-2 shrink-0 text-[11px] tabular-nums text-faint'
  }

  const noFilterActive = !active && !isTrash

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        Inbox
      </p>
      <Link href="/dashboard/lead-inbox" className={itemClasses(noFilterActive)}>
        <span className="font-medium">Alle</span>
        <span className={countClasses(noFilterActive)}>
          {inboxCount}
        </span>
      </Link>
      <p className="mt-3.5 px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        Beantwoord
      </p>
      {CATEGORIES.map((cat) => {
        const isActive = active === cat && !isTrash
        return (
          <Link
            key={cat}
            href={`/dashboard/lead-inbox?classification=${cat}`}
            className={itemClasses(isActive)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-[6px] w-[6px] shrink-0 rounded-full"
                style={{ background: CLASSIFICATION_DOT[cat] }}
                aria-hidden
              />
              <span className="truncate">{CLASSIFICATION_LABEL[cat]}</span>
            </span>
            <span className={countClasses(isActive)}>
              {folderCounts[cat]}
            </span>
          </Link>
        )
      })}
      <p className="mt-3.5 px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
        Overig
      </p>
      <Link href="/dashboard/lead-inbox?view=trash" className={itemClasses(isTrash)}>
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
          Prullenbak
        </span>
        <span className={countClasses(isTrash)}>
          {trashedLeads.length}
        </span>
      </Link>
    </nav>
  )
}
