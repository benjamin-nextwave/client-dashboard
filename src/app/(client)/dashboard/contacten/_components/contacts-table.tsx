'use client'

import { useState, useCallback } from 'react'
import { ContactDetail } from './contact-detail'

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
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
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
            placeholder="Zoek op naam, bedrijf, e-mail..."
            className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Zoeken
        </button>
        {search && (
          <button
            type="button"
            onClick={() => navigate(0, '')}
            className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Wissen
          </button>
        )}
      </form>

      {/* Results count */}
      <div className="mb-3 text-sm text-gray-500">
        {total.toLocaleString('nl-NL')} {total === 1 ? 'contact' : 'contacten'} gevonden
        {search && (
          <span>
            {' '}voor &ldquo;{search}&rdquo;
          </span>
        )}
      </div>

      {/* Table */}
      {contacts.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                    >
                      {col.name}
                    </th>
                  ))}
                  {columns.length > 5 && (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      ...
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="cursor-pointer transition-colors hover:bg-blue-50"
                  >
                    {visibleColumns.map((col) => (
                      <td
                        key={col.id}
                        className="max-w-[200px] truncate whitespace-nowrap px-4 py-3 text-sm text-gray-900"
                      >
                        {contact.data[col.id] || '-'}
                      </td>
                    ))}
                    {columns.length > 5 && (
                      <td className="px-4 py-3 text-sm text-gray-400">
                        +{columns.length - 5} velden
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
              <p className="text-sm text-gray-500">
                Pagina {currentPage + 1} van {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Vorige
                </button>
                <button
                  type="button"
                  onClick={() => navigate(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Volgende
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          {search ? 'Geen contacten gevonden voor deze zoekopdracht.' : 'Nog geen contacten beschikbaar.'}
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
