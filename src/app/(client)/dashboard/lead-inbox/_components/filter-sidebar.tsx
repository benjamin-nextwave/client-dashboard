'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Lead, LeadClassification } from '../_lib/types'
import { CLASSIFICATION_LABEL } from '../_lib/labels'

const CATEGORIES: LeadClassification[] = [
  'meeting_request',
  'phone_request',
  'interested',
  'referral',
  'internal_review',
  'not_now_maybe_later',
  'not_interested',
]

export function FilterSidebar({ leads }: { leads: Lead[] }) {
  const params = useSearchParams()
  const active = params.get('classification')

  const counts = CATEGORIES.reduce<Record<LeadClassification, number>>(
    (acc, cat) => {
      acc[cat] = leads.filter((l) => l.classification === cat).length
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
        Filteren
      </p>
      <Link href="/dashboard/lead-inbox" className={itemClasses(!active)}>
        <span className="font-medium">Alle</span>
        <span className={!active ? 'text-white/80 text-xs' : 'text-gray-500 text-xs'}>
          {leads.length}
        </span>
      </Link>
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
              {counts[cat]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
