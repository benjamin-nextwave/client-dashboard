'use client'

import { useState, useCallback } from 'react'
import { ContactDetail } from './contact-detail'
import { useT } from '@/lib/i18n/client'

type ContactRow = {
  id: string
  data: Record<string, string>
}

type ColumnDef = {
  id: string
  name: string
}

interface ContactsTableProps {
  contacts: ContactRow[]
  columns: ColumnDef[]
  total: number
  currentPage: number
  search: string
}

export function ContactsTable({
  contacts,
  columns,
  total,
  currentPage,
  search,
}: ContactsTableProps) {
  const t = useT()
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null)
  const pageSize = 50
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const navigate = useCallback((page: number, searchQuery?: string) => {
    const params = new URLSearchParams()
    if (page > 0) params.set('page', String(page))
    const q = searchQuery ?? search
    if (q) params.set('q', q)
    const qs = params.toString()
    window.location.href = `/dashboard/contacten${qs ? `?${qs}` : ''}`
  }, [search])

  const [searchInput, setSearchInput] = useState(search)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate(0, searchInput)
  }

  // Determine visible columns (max 5 in table, rest in detail)
  const visibleColumns = columns.slice(0, 5)

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('contacts.searchPlaceholder')}
            className="block w-full rounded-lg border border-line py-2.5 pl-10 pr-4 text-[12.5px] focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-control bg-[var(--brand-color)] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          {t('contacts.searchButton')}
        </button>
        {search && (
          <button
            type="button"
            onClick={() => navigate(0, '')}
            className="rounded-lg bg-track px-4 py-2.5 text-[12.5px] font-medium text-fg hover:bg-line"
          >
            {t('contacts.clearSearch')}
          </button>
        )}
      </form>

      {/* Results count */}
      <div className="mb-3 text-[12.5px] text-muted">
        {total === 1 ? t('contacts.foundCountSingular') : t('contacts.foundCount', { count: total.toLocaleString('nl-NL') })}
        {search && (
          <span> {t('contacts.foundFor', { query: search })}</span>
        )}
      </div>

      {/* Table */}
      {contacts.length > 0 ? (
        <div className="overflow-hidden rounded-panel border border-line bg-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-track">
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-muted"
                    >
                      {col.name}
                    </th>
                  ))}
                  {columns.length > 5 && (
                    <th className="px-4 py-3 text-left text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                      ...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="cursor-pointer transition-colors hover:bg-[var(--brand-08)]"
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className="max-w-[200px] truncate whitespace-nowrap px-4 py-3 text-[12.5px] text-fg"
                      >
                        {contact.data[col.id] || '-'}
                      </td>
                    ))}
                    {columns.length > 5 && (
                      <td className="px-4 py-3 text-[12.5px] text-faint">
                        {t('contacts.moreFields', { count: columns.length - 5 })}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line bg-panel px-4 py-3">
              <p className="text-[12.5px] text-muted">
                {t('contacts.pagination', { current: currentPage + 1, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
                >
                  {t('contacts.paginationPrevious')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="rounded-md border border-line px-3 py-1.5 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
                >
                  {t('contacts.paginationNext')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-track p-8 text-center text-[12.5px] text-muted">
          {search ? t('inbox.noResultsForSearch') : t('contacts.empty')}
        </div>
      )}

      {/* Detail slide-over */}
      {selectedContact && (
        <ContactDetail
          contact={selectedContact}
          columns={columns}
          onClose={() => setSelectedContact(null)}
        />
      )}
    </div>
  )
}
