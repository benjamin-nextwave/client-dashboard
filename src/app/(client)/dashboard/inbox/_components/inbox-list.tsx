'use client'

import type { InboxLead } from '@/lib/data/inbox-data'
import { InboxItem } from './inbox-item'

interface InboxListProps {
  leads: InboxLead[]
  isRecruitment: boolean
}

export function InboxList({ leads, isRecruitment }: InboxListProps) {
  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="divide-y divide-gray-100">
        {leads.map((lead) => (
          <InboxItem
            key={lead.id}
            lead={lead}
            isRecruitment={isRecruitment}
          />
        ))}
      </div>
    </div>
  )
}
