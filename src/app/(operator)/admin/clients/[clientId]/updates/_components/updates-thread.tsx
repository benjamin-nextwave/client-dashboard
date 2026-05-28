'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createClientUpdate,
  deleteClientUpdate,
  toggleClientUpdateLinked,
  toggleClientUpdateUrgent,
} from '../../overview-actions'

type Author = 'kix' | 'merlijn' | 'benjamin'

const AUTHORS: Author[] = ['kix', 'merlijn', 'benjamin']
const AUTHOR_LABELS: Record<Author, string> = {
  kix: 'Kix',
  merlijn: 'Merlijn',
  benjamin: 'Benjamin',
}
const AUTHOR_COLORS: Record<Author, string> = {
  kix: 'bg-violet-100 text-violet-700 border-violet-200',
  merlijn: 'bg-amber-100 text-amber-700 border-amber-200',
  benjamin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

interface Update {
  id: string
  author: string
  message: string
  isUrgent: boolean
  linkedToSummary: boolean
  createdAt: string
}

interface Props {
  clientId: string
  initialUpdates: Update[]
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function UpdatesThread({ clientId, initialUpdates }: Props) {
  const router = useRouter()
  const [updates, setUpdates] = useState<Update[]>(initialUpdates)
  const [author, setAuthor] = useState<Author>('benjamin')
  const [message, setMessage] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [linkedToSummary, setLinkedToSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handlePost = () => {
    setError(null)
    if (!message.trim()) {
      setError('Schrijf eerst een bericht.')
      return
    }
    startTransition(async () => {
      const result = await createClientUpdate(clientId, {
        author,
        message: message.trim(),
        isUrgent,
        linkedToSummary,
      })
      if (result.error || !result.id) {
        setError(result.error ?? 'Onbekende fout')
        return
      }
      // Optimistically prepend
      setUpdates((prev) => [
        {
          id: result.id!,
          author,
          message: message.trim(),
          isUrgent,
          linkedToSummary,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ])
      setMessage('')
      setIsUrgent(false)
      setLinkedToSummary(false)
      router.refresh()
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteClientUpdate(clientId, id)
      if (!result.error) {
        setUpdates((prev) => prev.filter((u) => u.id !== id))
        router.refresh()
      }
    })
  }

  const handleToggleLinked = (id: string, next: boolean) => {
    setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, linkedToSummary: next } : u)))
    startTransition(async () => {
      const result = await toggleClientUpdateLinked(clientId, id, next)
      if (result.error) {
        // revert
        setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, linkedToSummary: !next } : u)))
      }
      router.refresh()
    })
  }

  const handleToggleUrgent = (id: string, next: boolean) => {
    setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, isUrgent: next } : u)))
    startTransition(async () => {
      const result = await toggleClientUpdateUrgent(clientId, id, next)
      if (result.error) {
        setUpdates((prev) => prev.map((u) => (u.id === id ? { ...u, isUrgent: !next } : u)))
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Composer */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Afzender</span>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              {AUTHORS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAuthor(a)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    author === a
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {AUTHOR_LABELS[a]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Wat is er gebeurd of besproken?"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-red-600 focus:ring-red-400"
              />
              <span className="inline-flex items-center gap-1">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-md border border-red-200 bg-red-100 text-[10px] font-bold text-red-700">!</span>
                Urgent
              </span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={linkedToSummary}
                onChange={(e) => setLinkedToSummary(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
              />
              Verbindt aan samenvatting
            </label>
          </div>
          <button
            type="button"
            onClick={handlePost}
            disabled={pending}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Plaatsen…' : 'Bericht plaatsen'}
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </section>

      {/* Thread */}
      {updates.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-12 text-center">
          <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">Nog geen updates geplaatst.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {updates.map((u) => {
            const authorKey = (AUTHORS as readonly string[]).includes(u.author)
              ? (u.author as Author)
              : null
            return (
              <li
                key={u.id}
                className={`rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                  u.isUrgent
                    ? 'border-red-200 bg-gradient-to-br from-red-50/80 to-rose-50/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      authorKey ? AUTHOR_COLORS[authorKey] : 'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {authorKey ? AUTHOR_LABELS[authorKey] : u.author}
                    </span>
                    {u.isUrgent && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                        <span>!</span>
                        Urgent
                      </span>
                    )}
                    {u.linkedToSummary && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                        </svg>
                        Op overzicht
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500">{formatTimestamp(u.createdAt)}</span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleUrgent(u.id, !u.isUrgent)}
                      className={`rounded-md p-1.5 text-xs transition-colors ${
                        u.isUrgent ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'text-gray-400 hover:bg-gray-100 hover:text-red-600'
                      }`}
                      title={u.isUrgent ? 'Urgent weghalen' : 'Markeer als urgent'}
                    >
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center font-bold">!</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleLinked(u.id, !u.linkedToSummary)}
                      className={`rounded-md p-1.5 text-xs transition-colors ${
                        u.linkedToSummary ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'
                      }`}
                      title={u.linkedToSummary ? 'Loskoppelen van samenvatting' : 'Verbindt aan samenvatting'}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Update verwijderen?')) handleDelete(u.id)
                      }}
                      className="rounded-md p-1.5 text-xs text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Verwijderen"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{u.message}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
