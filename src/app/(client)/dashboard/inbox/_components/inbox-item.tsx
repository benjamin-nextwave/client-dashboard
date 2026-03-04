'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useTransition, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale/nl'
import type { InboxLead, InboxFolder } from '@/lib/data/inbox-data'
import { dismissLead, deleteLeadFromInbox, moveLeadToFolder } from '@/lib/actions/inbox-actions'

interface InboxItemProps {
  lead: InboxLead
  isRecruitment: boolean
  isArchived?: boolean
  folders: InboxFolder[]
}

export function InboxItem({ lead, isArchived = false, folders }: InboxItemProps) {
  const [isPending, startTransition] = useTransition()
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const router = useRouter()
  const needsAction = !lead.client_has_replied
  const isUnopened = !lead.opened_at
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
  const previewText = lead.reply_content?.replace(/<[^>]*>/g, '').trim() ?? ''

  const relativeDate = lead.reply_date
    ? format(new Date(lead.reply_date), 'd MMM HH:mm', { locale: nl })
    : ''

  // Close menu on outside click
  useEffect(() => {
    if (!showMoveMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMoveMenu])

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

  function handleMove(e: React.MouseEvent, folderId: string | null) {
    e.preventDefault()
    e.stopPropagation()
    setShowMoveMenu(false)
    startTransition(async () => {
      await moveLeadToFolder(lead.id, folderId)
      router.refresh()
    })
  }

  function toggleMoveMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!showMoveMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuHeight = (2 + folders.length) * 36 + 20 // approximate menu height
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow < menuHeight ? rect.top - menuHeight : rect.bottom + 4
      const left = Math.max(8, rect.right - 192) // 192 = w-48
      setMenuPos({ top, left })
    }
    setShowMoveMenu((prev) => !prev)
  }

  // Determine current location for disabling in menu
  const currentLocation = isArchived
    ? 'archived'
    : lead.folder_id ?? 'inbox'

  // Find current folder for colored dot
  const currentFolder = folders.find((f) => f.id === lead.folder_id)

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
              {currentFolder && (
                <span
                  className="mr-1.5 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: currentFolder.color }}
                />
              )}
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
          {/* Move menu */}
          <div ref={menuRef}>
            <button
              ref={buttonRef}
              type="button"
              onClick={toggleMoveMenu}
              title="Verplaats naar..."
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            {showMoveMenu && menuPos && createPortal(
              <div
                className="fixed z-50 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg"
                style={{ top: menuPos.top, left: menuPos.left }}
                ref={(el) => {
                  // Also attach to menuRef for outside-click detection
                  if (el) (menuRef as React.MutableRefObject<HTMLDivElement>).current = el
                }}
              >
                <button
                  type="button"
                  onClick={(e) => handleMove(e, null)}
                  disabled={currentLocation === 'inbox'}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    currentLocation === 'inbox'
                      ? 'bg-gray-50 text-gray-400 cursor-default'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Inbox
                  {currentLocation === 'inbox' && <span className="ml-1 text-xs text-gray-400">(huidig)</span>}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleMove(e, 'archived')}
                  disabled={currentLocation === 'archived'}
                  className={`w-full px-3 py-2 text-left text-sm ${
                    currentLocation === 'archived'
                      ? 'bg-gray-50 text-gray-400 cursor-default'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Afgehandeld
                  {currentLocation === 'archived' && <span className="ml-1 text-xs text-gray-400">(huidig)</span>}
                </button>
                {folders.length > 0 && (
                  <div className="my-1 border-t border-gray-100" />
                )}
                {folders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={(e) => handleMove(e, f.id)}
                    disabled={currentLocation === f.id}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      currentLocation === f.id
                        ? 'bg-gray-50 text-gray-400 cursor-default'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: f.color }} />
                    {f.name}
                    {currentLocation === f.id && <span className="text-xs text-gray-400">(huidig)</span>}
                  </button>
                ))}
              </div>,
              document.body
            )}
          </div>

          {needsAction && !isArchived && (
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
