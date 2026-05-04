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

export function FilterChips({ leads }: { leads: Lead[] }) {
  const params = useSearchParams()
  const active = params.get('classification')

  function chipClasses(isActive: boolean) {
    return [
      'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
      isActive
        ? 'bg-[var(--color-brand)] text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    ].join(' ')
  }

  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-3">
      <Link href="/dashboard/lead-inbox" className={chipClasses(!active)}>
        Alle ({leads.length})
      </Link>
      {CATEGORIES.map((cat) => {
        const count = leads.filter((l) => l.classification === cat).length
        const isActive = active === cat
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
    </div>
  )
}
