'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { InboxLead, InboxFolder } from '@/lib/data/inbox-data'
import { dismissLead, deleteLeadFromInbox, archiveLead, unarchiveLead } from '@/lib/actions/inbox-actions'
import { moveLeadToFolder } from '@/lib/actions/folder-actions'

interface InboxItemProps {
  lead: InboxLead
  isRecruitment: boolean
  isArchived?: boolean
  folders: InboxFolder[]
  currentFolderId: string | null
}

export function InboxItem({ lead, isArchived = false, folders, currentFolderId }: InboxItemProps) {
  const [isPending, startTransition] = useTransition()
  const [showMoveMenu, setShowMoveMenu] = useState(false)
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

  function handleMove(e: React.MouseEvent, folderId: string | null) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      await moveLeadToFolder(lead.id, folderId)
      setShowMoveMenu(false)
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
          {lead.objection_status === 'submitted' ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
              Bezwaar ingediend
            </span>
          ) : lead.objection_status === 'approved' ? (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              Bezwaar goedgekeurd
            </span>
          ) : lead.objection_status === 'rejected' ? (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
              Bezwaar afgekeurd
            </span>
          ) : isArchived ? (
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
          {/* Move to folder button */}
          {folders.length > 0 && !isArchived && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMoveMenu(!showMoveMenu) }}
                title="Verplaats naar mapje"
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </button>
              {showMoveMenu && (
                <div
                  className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
                >
                  {currentFolderId && (
                    <button
                      type="button"
                      onClick={(e) => handleMove(e, null)}
                      className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Inbox (standaard)
                    </button>
                  )}
                  {folders
                    .filter((f) => f.id !== currentFolderId)
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={(e) => handleMove(e, f.id)}
                        className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {f.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

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
