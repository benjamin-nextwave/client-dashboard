'use client'

import { useState, useMemo, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { InboxLead, InboxFolder } from '@/lib/data/inbox-data'
import { refreshInbox, reorderFolders } from '@/lib/actions/inbox-actions'
import { InboxItem } from './inbox-item'
import { ComposeModal } from './compose-modal'
import { RefreshOverlay } from './refresh-overlay'
import { FolderModal } from './folder-modal'

interface InboxListProps {
  leads: InboxLead[]
  isRecruitment: boolean
  folders: InboxFolder[]
}

type StatusFilter = 'all' | 'action_required' | 'in_conversation'

export function InboxList({ leads, isRecruitment, folders }: InboxListProps) {
  const [showCompose, setShowCompose] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // 'inbox' | 'archived' | folder UUID
  const [activeTab, setActiveTab] = useState<string>('inbox')
  const [isRefreshing, startRefresh] = useTransition()
  const router = useRouter()

  // Folder modal state
  const [folderModalOpen, setFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<InboxFolder | null>(null)

  // Drag-and-drop state for folder tabs
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const [, startReorder] = useTransition()

  const inboxLeads = useMemo(() => leads.filter((l) => !l.archived_at && !l.folder_id), [leads])
  const archivedLeads = useMemo(() => leads.filter((l) => !!l.archived_at), [leads])

  const folderLeadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of folders) {
      counts[f.id] = leads.filter((l) => l.folder_id === f.id).length
    }
    return counts
  }, [leads, folders])

  const activeLeads = useMemo(() => {
    if (activeTab === 'inbox') return inboxLeads
    if (activeTab === 'archived') return archivedLeads
    return leads.filter((l) => l.folder_id === activeTab)
  }, [activeTab, inboxLeads, archivedLeads, leads])

  const filteredLeads = useMemo(() => {
    let result = activeLeads

    // Search filter
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(
        (lead) =>
          lead.email.toLowerCase().includes(term) ||
          (lead.first_name?.toLowerCase().includes(term) ?? false) ||
          (lead.last_name?.toLowerCase().includes(term) ?? false) ||
          (lead.company_name?.toLowerCase().includes(term) ?? false)
      )
    }

    // Status filter (only for inbox folder)
    if (activeTab === 'inbox') {
      if (statusFilter === 'action_required') {
        result = result.filter((lead) => !lead.client_has_replied)
      } else if (statusFilter === 'in_conversation') {
        result = result.filter((lead) => lead.client_has_replied)
      }
    }

    return result
  }, [activeLeads, search, statusFilter, activeTab])

  function handleFolderContextMenu(e: React.MouseEvent, folder: InboxFolder) {
    e.preventDefault()
    setEditingFolder(folder)
    setFolderModalOpen(true)
  }

  function handleCreateFolder() {
    setEditingFolder(null)
    setFolderModalOpen(true)
  }

  function handleCloseFolderModal() {
    setFolderModalOpen(false)
    setEditingFolder(null)
  }

  function handleDragStart(e: React.DragEvent, folderId: string) {
    setDraggedFolderId(folderId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (folderId !== draggedFolderId) {
      setDragOverFolderId(folderId)
    }
  }

  function handleDragLeave() {
    setDragOverFolderId(null)
  }

  function handleDrop(e: React.DragEvent, targetFolderId: string) {
    e.preventDefault()
    setDragOverFolderId(null)
    if (!draggedFolderId || draggedFolderId === targetFolderId) {
      setDraggedFolderId(null)
      return
    }

    // Compute new order
    const currentOrder = folders.map((f) => f.id)
    const fromIndex = currentOrder.indexOf(draggedFolderId)
    const toIndex = currentOrder.indexOf(targetFolderId)
    if (fromIndex === -1 || toIndex === -1) return

    const newOrder = [...currentOrder]
    newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, draggedFolderId)

    setDraggedFolderId(null)
    startReorder(async () => {
      await reorderFolders(newOrder)
      router.refresh()
    })
  }

  function handleDragEnd() {
    setDraggedFolderId(null)
    setDragOverFolderId(null)
  }

  const emptyMessage = activeTab === 'archived'
    ? 'Geen afgehandelde leads.'
    : activeTab === 'inbox'
      ? 'Geen leads gevonden voor deze zoekopdracht.'
      : 'Geen leads in deze map.'

  return (
    <div>
      {/* Folder tabs */}
      <div className="mt-6 flex items-center border-b border-gray-200 overflow-x-auto">
        {/* Inbox tab */}
        <button
          type="button"
          onClick={() => setActiveTab('inbox')}
          className={`relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'inbox'
              ? 'text-[var(--brand-color)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Inbox
          {inboxLeads.length > 0 && (
            <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              activeTab === 'inbox' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)]' : 'bg-gray-100 text-gray-600'
            }`}>
              {inboxLeads.length}
            </span>
          )}
          {activeTab === 'inbox' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-color)]" />
          )}
        </button>

        {/* Afgehandeld tab */}
        <button
          type="button"
          onClick={() => setActiveTab('archived')}
          className={`relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'archived'
              ? 'text-gray-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Afgehandeld
          {archivedLeads.length > 0 && (
            <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              activeTab === 'archived' ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {archivedLeads.length}
            </span>
          )}
          {activeTab === 'archived' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400" />
          )}
        </button>

        {/* Custom folder tabs (draggable) */}
        {folders.map((f) => (
          <button
            key={f.id}
            type="button"
            draggable
            onClick={() => setActiveTab(f.id)}
            onContextMenu={(e) => handleFolderContextMenu(e, f)}
            onDragStart={(e) => handleDragStart(e, f.id)}
            onDragOver={(e) => handleDragOver(e, f.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, f.id)}
            onDragEnd={handleDragEnd}
            className={`relative flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors cursor-grab active:cursor-grabbing ${
              activeTab === f.id
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            } ${draggedFolderId === f.id ? 'opacity-40' : ''} ${
              dragOverFolderId === f.id ? 'border-l-2 border-[var(--brand-color)]' : ''
            }`}
          >
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: f.color }} />
            {f.name}
            {(folderLeadCounts[f.id] ?? 0) > 0 && (
              <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                activeTab === f.id ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {folderLeadCounts[f.id]}
              </span>
            )}
            {activeTab === f.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: f.color }} />
            )}
          </button>
        ))}

        {/* Add folder button */}
        {folders.length < 6 && (
          <button
            type="button"
            onClick={handleCreateFolder}
            title="Nieuwe map aanmaken"
            className="flex-shrink-0 px-3 py-2.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Search and filter bar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Zoek op naam, e-mail of bedrijf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            />
          </div>
          {activeTab === 'inbox' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            >
              <option value="all">Alles</option>
              <option value="action_required">Actie vereist</option>
              <option value="in_conversation">In gesprek</option>
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              startRefresh(async () => {
                await refreshInbox()
                router.refresh()
              })
            }}
            disabled={isRefreshing}
            title="Mist u recente e-mails? Klik hier om te verversen."
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isRefreshing ? 'Verversen...' : 'Verversen'}</span>
          </button>
          {activeTab === 'inbox' && (
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Nieuwe e-mail
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="mt-2 text-xs text-gray-500">
        {filteredLeads.length} van {activeLeads.length} leads
      </p>

      {isRefreshing && (
        <div className="mt-3">
          <RefreshOverlay isRefreshing={isRefreshing} />
        </div>
      )}

      <div className={`mt-3 rounded-lg border border-gray-200 bg-white ${isRefreshing ? 'pointer-events-none opacity-40 blur-[1px] transition-all duration-300' : ''}`}>
        {filteredLeads.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => (
              <InboxItem
                key={lead.id}
                lead={lead}
                isRecruitment={isRecruitment}
                isArchived={activeTab === 'archived'}
                folders={folders}
              />
            ))}
          </div>
        )}
      </div>

      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        leads={leads}
      />

      <FolderModal
        isOpen={folderModalOpen}
        onClose={handleCloseFolderModal}
        folder={editingFolder}
      />
    </div>
  )
}
