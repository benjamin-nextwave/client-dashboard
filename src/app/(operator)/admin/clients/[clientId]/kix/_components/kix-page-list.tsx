'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { KixPageSummary } from '@/lib/kix/types'
import { createKixPage, deleteKixPage, duplicateKixPage } from '../actions'

interface Props {
  clientId: string
  pages: KixPageSummary[]
}

export function KixPageList({ clientId, pages }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      const result = await createKixPage(clientId)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.pageId) router.push(`/admin/clients/${clientId}/kix/${result.pageId}`)
    })
  }

  const handleDuplicate = (pageId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await duplicateKixPage(clientId, pageId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleDelete = (pageId: string) => {
    setError(null)
    startTransition(async () => {
      const result = await deleteKixPage(clientId, pageId)
      if (result.error) setError(result.error)
      else {
        setConfirmDelete(null)
        router.refresh()
      }
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          Pagina&apos;s <span className="font-normal text-gray-400">({pages.length})</span>
        </h2>
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuwe pagina
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      {pages.length === 0 ? (
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-14 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 disabled:opacity-50"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-gray-700">Eerste pagina maken</span>
          <span className="text-xs text-gray-400">Tekst, checklists, tabellen, schema&apos;s en tekeningen</span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Titel</th>
                <th className="px-4 py-2.5 text-center">Blokken</th>
                <th className="px-4 py-2.5">Aangemaakt</th>
                <th className="px-4 py-2.5">Laatst bewerkt</th>
                <th className="px-4 py-2.5 text-right">Acties</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/clients/${clientId}/kix/${page.id}`}
                      className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      <span aria-hidden>{page.icon}</span>
                      {page.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-gray-500">{page.blockCount}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{formatMoment(page.createdAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {formatMoment(page.updatedAt)}
                    <div className="text-[11px] text-gray-400">{relativeFrom(page.updatedAt)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {confirmDelete === page.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-gray-500">Verwijderen?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(page.id)}
                          disabled={isPending}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          Ja
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                          Nee
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(page.id)}
                          disabled={isPending}
                          title="Dupliceren"
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m0 0H5.625" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(page.id)}
                          title="Verwijderen"
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition-colors hover:border-rose-300 hover:text-rose-600"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function formatMoment(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function relativeFrom(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.round((then - Date.now()) / 60000)
  const rtf = new Intl.RelativeTimeFormat('nl-NL', { numeric: 'auto' })

  const absMinutes = Math.abs(minutes)
  if (absMinutes < 60) return rtf.format(minutes, 'minute')
  if (absMinutes < 60 * 24) return rtf.format(Math.round(minutes / 60), 'hour')
  if (absMinutes < 60 * 24 * 30) return rtf.format(Math.round(minutes / (60 * 24)), 'day')
  return rtf.format(Math.round(minutes / (60 * 24 * 30)), 'month')
}
