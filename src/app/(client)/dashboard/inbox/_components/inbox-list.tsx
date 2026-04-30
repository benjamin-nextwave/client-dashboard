'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { InboxLead, InboxFolder } from '@/lib/data/inbox-data'
import { refreshInbox } from '@/lib/actions/inbox-actions'
import { createFolder, renameFolder, deleteFolder } from '@/lib/actions/folder-actions'
import { InboxItem } from './inbox-item'
import { ComposeModal } from './compose-modal'
import { RefreshOverlay } from './refresh-overlay'
import { useT } from '@/lib/i18n/client'

interface InboxListProps {
  leads: InboxLead[]
  isRecruitment: boolean
  folders: InboxFolder[]
}

type FolderTab = 'inbox' | 'archived' | string // string = custom folder id
type StatusFilter = 'all' | 'action_required' | 'in_conversation'

export function InboxList({ leads, isRecruitment, folders }: InboxListProps) {
  const t = useT()
  const [showCompose, setShowCompose] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [activeTab, setActiveTab] = useState<FolderTab>('inbox')
  const [isRefreshing, startRefresh] = useTransition()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Folder management state
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null)

  // Categorize leads
  const inboxLeads = useMemo(
    () => leads.filter((l) => !l.archived_at && !l.folder_id),
    [leads]
  )
  const archivedLeads = useMemo(
    () => leads.filter((l) => !!l.archived_at),
    [leads]
  )

  const folderLeadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of folders) {
      counts[f.id] = leads.filter((l) => l.folder_id === f.id && !l.archived_at).length
    }
    return counts
  }, [leads, folders])

  const activeLeads = useMemo(() => {
    if (activeTab === 'inbox') return inboxLeads
    if (activeTab === 'archived') return archivedLeads
    // Custom folder
    return leads.filter((l) => l.folder_id === activeTab && !l.archived_at)
  }, [activeTab, inboxLeads, archivedLeads, leads])

  const filteredLeads = useMemo(() => {
    let result = activeLeads

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

    // Status filter (only for inbox and custom folders)
    if (activeTab !== 'archived') {
      if (statusFilter === 'action_required') {
        result = result.filter((lead) => !lead.client_has_replied)
      } else if (statusFilter === 'in_conversation') {
        result = result.filter((lead) => lead.client_has_replied)
      }
    }

    return result
  }, [activeLeads, search, statusFilter, activeTab])

  function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) return
    startTransition(async () => {
      await createFolder(name)
      setNewFolderName('')
      setShowNewFolder(false)
      router.refresh()
    })
  }

  function handleRenameFolder(folderId: string) {
    const name = editingFolderName.trim()
    if (!name) return
    startTransition(async () => {
      await renameFolder(folderId, name)
      setEditingFolderId(null)
      setEditingFolderName('')
      router.refresh()
    })
  }

  function handleDeleteFolder(folderId: string) {
    if (!confirm(t('inbox.folderDeleteConfirm'))) return
    startTransition(async () => {
      await deleteFolder(folderId)
      if (activeTab === folderId) setActiveTab('inbox')
      setFolderMenuId(null)
      router.refresh()
    })
  }

  // Tab rendering helper
  function renderTab(id: FolderTab, label: string, count: number) {
    const isActive = activeTab === id
    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveTab(id)}
        className={`relative whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'text-[var(--brand-color)]'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        {label}
        {count > 0 && (
          <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            isActive ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)]' : 'bg-gray-100 text-gray-600'
          }`}>
            {count}
          </span>
        )}
        {isActive && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-color)]" />
        )}
      </button>
    )
  }

  return (
    <div>
      {/* Folder tabs */}
      <div className="mt-6 flex items-center border-b border-gray-200">
        <div className="flex flex-1 flex-wrap">
          {renderTab('inbox', t('inbox.folderInbox'), inboxLeads.length)}
          {folders.map((f) => {
            const isEditing = editingFolderId === f.id
            return (
              <div key={f.id} className="flex items-center">
                {isEditing ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRenameFolder(f.id) }}
                    className="flex items-center px-2 py-1.5"
                  >
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[var(--brand-color)] focus:outline-none"
                      autoFocus
                      onBlur={() => { setEditingFolderId(null); setEditingFolderName('') }}
                      onKeyDown={(e) => { if (e.key === 'Escape') { setEditingFolderId(null); setEditingFolderName('') } }}
                    />
                  </form>
                ) : (
                  <>
                    {renderTab(f.id, f.name, folderLeadCounts[f.id] ?? 0)}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === f.id ? null : f.id) }}
                      className="ml-[-8px] mr-1 rounded p-0.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )
          })}
          {renderTab('archived', t('inbox.folderArchived'), archivedLeads.length)}
        </div>

        {/* Add folder button */}
        {showNewFolder ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreateFolder() }}
            className="flex items-center gap-1 px-2"
          >
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('inbox.folderNewPlaceholder')}
              className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[var(--brand-color)] focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
            />
            <button type="submit" disabled={isPending || !newFolderName.trim()} className="rounded bg-[var(--brand-color)] px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50">
              {t('inbox.folderConfirm')}
            </button>
            <button type="button" onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
              {t('common.cancel')}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowNewFolder(true)}
            title={t('inbox.folderNewTitle')}
            className="ml-2 flex-shrink-0 rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}
      </div>

      {/* Folder context menu — rendered outside overflow container */}
      {folderMenuId && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setFolderMenuId(null)} />
          <div className="relative z-50">
            <div className="absolute left-0 top-0 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  const f = folders.find((f) => f.id === folderMenuId)
                  if (f) {
                    setEditingFolderId(f.id)
                    setEditingFolderName(f.name)
                  }
                  setFolderMenuId(null)
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                {t('inbox.folderRename')}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteFolder(folderMenuId)}
                className="block w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                {t('inbox.folderDelete')}
              </button>
            </div>
          </div>
        </>
      )}

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
              placeholder={t('inbox.searchPlaceholderFull')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            />
          </div>
          {activeTab !== 'archived' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            >
              <option value="all">{t('inbox.statusFilterAll')}</option>
              <option value="action_required">{t('inbox.statusFilterActionRequired')}</option>
              <option value="in_conversation">{t('inbox.statusFilterInConversation')}</option>
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
            title={t('inbox.refreshTitle')}
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
            <span>{isRefreshing ? t('inbox.refreshButtonProgress') : t('inbox.refreshButton')}</span>
          </button>
          {activeTab !== 'archived' && (
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              {t('inbox.composeNew')}
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="mt-2 text-xs text-gray-500">
        {t('inbox.resultsCount', { shown: filteredLeads.length, total: activeLeads.length })}
      </p>

      {isRefreshing && (
        <div className="mt-3">
          <RefreshOverlay isRefreshing={isRefreshing} />
        </div>
      )}

      <div className={`mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white ${isRefreshing ? 'pointer-events-none opacity-40 blur-[1px] transition-all duration-300' : ''}`}>
        {filteredLeads.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {activeTab === 'archived'
              ? t('inbox.folderArchivedEmpty')
              : t('inbox.noResultsForSearch')}
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
                currentFolderId={lead.folder_id}
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
    </div>
  )
}
