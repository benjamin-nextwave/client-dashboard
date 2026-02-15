'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { InboxLead } from '@/lib/data/inbox-data'

interface InboxItemProps {
  lead: InboxLead
  isRecruitment: boolean
}

export function InboxItem({ lead, isRecruitment }: InboxItemProps) {
  const isNew = !lead.client_has_replied
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
  const previewText = lead.reply_content?.replace(/<[^>]*>/g, '').trim() ?? ''

  const relativeDate = lead.reply_date
    ? formatDistanceToNow(new Date(lead.reply_date), {
        addSuffix: true,
        locale: nl,
      })
    : ''

  return (
    <Link
      href={`/dashboard/inbox/${lead.id}`}
      className={`block px-4 py-3 transition-colors hover:bg-gray-50 ${
        isNew ? 'bg-white' : 'bg-gray-50/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status badge */}
        <div className="flex-shrink-0 pt-0.5">
          {isNew ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              Nieuwe lead
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              In gesprek
            </span>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`truncate text-sm ${
                isNew ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
              }`}
            >
              {name}
            </span>
            <span className="flex-shrink-0 text-xs text-gray-500">
              {relativeDate}
            </span>
          </div>

          {lead.company_name && (
            <p className="truncate text-xs text-gray-500">{lead.company_name}</p>
          )}

          {lead.reply_subject && (
            <p
              className={`mt-0.5 truncate text-sm ${
                isNew ? 'font-medium text-gray-800' : 'text-gray-600'
              }`}
            >
              {lead.reply_subject}
            </p>
          )}

          {previewText && (
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {previewText}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
