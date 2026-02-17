'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { InboxLead } from '@/lib/data/inbox-data'
import { dismissLead, deleteLeadFromInbox, archiveLead, unarchiveLead } from '@/lib/actions/inbox-actions'

interface InboxItemProps {
  lead: InboxLead
  isRecruitment: boolean
  isArchived?: boolean
}

export function InboxItem({ lead, isArchived = false }: InboxItemProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const needsAction = !lead.client_has_replied
  const isUnopened = !lead.opened_at
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
  const previewText = lead.reply_content?.replace(/<[^>]*>/g, '').trim() ?? ''

  const relativeDate = lead.reply_date
    ? formatDistanceToNow(new Date(lead.reply_date), {
        addSuffix: true,
        locale: nl,
      })
    : ''

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await dismissLead(lead.id)
      router.refresh()
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Weet u zeker dat u deze lead wilt verwijderen uit de inbox?')) return
    startTransition(async () => {
      await deleteLeadFromInbox(lead.id)
      router.refresh()
    })
  }

  function handleArchive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await archiveLead(lead.id)
      router.refresh()
    })
  }

  function handleUnarchive(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await unarchiveLead(lead.id)
      router.refresh()
    })
  }

  return (
    <Link
      href={`/dashboard/inbox/${lead.id}`}
      className={`block px-4 py-3 transition-colors hover:bg-gray-50 ${
        needsAction && !isArchived ? 'bg-white' : 'bg-gray-50/30'
      } ${isUnopened && !isArchived ? 'border-l-4 border-[var(--brand-color)]' : ''} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Status badge */}
        <div className="flex-shrink-0 pt-0.5">
          {isArchived ? (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              Afgehandeld
            </span>
          ) : needsAction ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
              Actie vereist
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
                needsAction && !isArchived ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
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
                needsAction && !isArchived ? 'font-medium text-gray-800' : 'text-gray-600'
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

        {/* Action buttons */}
        <div className="flex flex-shrink-0 items-center gap-1">
          {isArchived ? (
            <button
              type="button"
              onClick={handleUnarchive}
              title="Verplaats naar Inbox"
              className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              Naar Inbox
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleArchive}
                title="Verplaats naar Afgehandeld"
                className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                Afgehandeld
              </button>
              {needsAction && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  title="Markeer als afgehandeld"
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </>
          )}
          <button
            type="button"
            onClick={handleDelete}
            title="Verwijder uit inbox"
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </Link>
  )
}
