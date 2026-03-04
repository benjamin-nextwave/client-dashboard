'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { InboxFolder } from '@/lib/data/inbox-data'
import { moveLeadToFolder } from '@/lib/actions/inbox-actions'

interface ArchiveButtonProps {
  leadId: string
  isArchived: boolean
  folderId: string | null
  folders: InboxFolder[]
}

export function ArchiveButton({ leadId, isArchived, folderId, folders }: ArchiveButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const currentLocation = isArchived ? 'archived' : folderId ?? 'inbox'

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

  function handleMove(targetFolderId: string | null) {
    setShowMenu(false)
    startTransition(async () => {
      await moveLeadToFolder(leadId, targetFolderId)
      router.refresh()
    })
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setShowMenu((prev) => !prev)}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${
          isPending ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Verplaats naar...
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => handleMove(null)}
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
            onClick={() => handleMove('archived')}
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
              onClick={() => handleMove(f.id)}
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
        </div>
      )}
    </div>
  )
}
