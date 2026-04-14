'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { TimelineEvent } from '@/lib/data/activity-timeline'
import { markEventSeen, markEventUnseen, markAllSeen, saveEventNote } from '../actions'

type FilterMode = 'all' | 'unseen' | 'seen'

function groupByDate(events: TimelineEvent[]): { label: string; events: TimelineEvent[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86_400_000

  const groups: Map<string, TimelineEvent[]> = new Map()

  for (const event of events) {
    const t = new Date(event.timestamp).getTime()
    let label: string
    if (t >= today) {
      label = 'Vandaag'
    } else if (t >= yesterday) {
      label = 'Gisteren'
    } else {
      const d = new Date(event.timestamp)
      label = d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })
      label = label.charAt(0).toUpperCase() + label.slice(1)
    }

    if (!groups.has(label)) groups.set(label, [])
    groups.get(label)!.push(event)
  }

  return Array.from(groups.entries()).map(([label, events]) => ({ label, events }))
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

const TYPE_ICONS: Record<string, { bg: string; icon: React.ReactNode }> = {
  form_submitted: {
    bg: 'bg-indigo-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
      </svg>
    ),
  },
  variants_approved: {
    bg: 'bg-emerald-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  preview_approved: {
    bg: 'bg-emerald-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  dnc_confirmed: {
    bg: 'bg-emerald-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
  variants_acknowledged: {
    bg: 'bg-amber-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75" />
      </svg>
    ),
  },
  proposal_acknowledged: {
    bg: 'bg-violet-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  pdf_uploaded: {
    bg: 'bg-gray-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  proposal_published: {
    bg: 'bg-violet-500',
    icon: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
}

const DEFAULT_ICON = {
  bg: 'bg-gray-400',
  icon: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
}

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')

  const unseenCount = events.filter((e) => !e.seen).length

  const byMode =
    filter === 'unseen'
      ? events.filter((e) => !e.seen)
      : filter === 'seen'
        ? events.filter((e) => e.seen)
        : events

  const q = search.trim().toLowerCase()
  const filtered = q
    ? byMode.filter(
        (e) =>
          e.clientName.toLowerCase().includes(q) ||
          e.label.toLowerCase().includes(q) ||
          (e.note ?? '').toLowerCase().includes(q)
      )
    : byMode

  const groups = groupByDate(filtered)

  const handleToggle = (event: TimelineEvent) => {
    startTransition(async () => {
      if (event.seen) {
        await markEventUnseen(event.key)
      } else {
        await markEventSeen(event.key)
      }
      router.refresh()
    })
  }

  const handleMarkAllSeen = () => {
    const unseenKeys = events.filter((e) => !e.seen).map((e) => e.key)
    if (unseenKeys.length === 0) return
    startTransition(async () => {
      await markAllSeen(unseenKeys)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op bedrijfsnaam of activiteit..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Wissen"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')} label="Alles" count={events.length} />
          <FilterPill active={filter === 'unseen'} onClick={() => setFilter('unseen')} label="Nieuw" count={unseenCount} dot="bg-indigo-500" />
          <FilterPill active={filter === 'seen'} onClick={() => setFilter('seen')} label="Gezien" count={events.length - unseenCount} />
        </div>
        {unseenCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllSeen}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Alles als gezien markeren
          </button>
        )}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
          {filter === 'unseen' ? 'Geen nieuwe activiteiten.' : 'Nog geen activiteiten.'}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">
                  {group.label}
                </h3>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-1">
                {group.events.map((event) => (
                  <EventItem
                    key={event.key}
                    event={event}
                    pending={pending}
                    onToggle={() => handleToggle(event)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EventItem({
  event,
  pending,
  onToggle,
}: {
  event: TimelineEvent
  pending: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState(event.note ?? '')
  const [savingNote, startSaveNote] = useTransition()
  const [noteSaved, setNoteSaved] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const hasProposalDetails =
    (event.type === 'proposal_published' || event.type === 'proposal_acknowledged') &&
    !!event.details

  const icon = TYPE_ICONS[event.type] ?? DEFAULT_ICON

  const handleSaveNote = () => {
    startSaveNote(async () => {
      await saveEventNote(event.key, noteText)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
      router.refresh()
    })
  }

  return (
    <div
      className={`group rounded-xl px-4 py-3 transition-all ${
        event.seen
          ? 'opacity-50 hover:opacity-70'
          : 'bg-white shadow-sm ring-1 ring-gray-100'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon dot */}
        <div className="relative mt-0.5 flex-shrink-0">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${icon.bg}`}
          >
            {icon.icon}
          </div>
          {!event.seen && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{event.clientName}</span>
                <span className="text-xs text-gray-400">{formatTime(event.timestamp)}</span>
              </div>
              <div className="mt-0.5 text-sm text-gray-700">{event.label}</div>
              {event.nextAction && !event.seen && (
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                  {event.nextAction}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {hasProposalDetails && (
                <button
                  type="button"
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  title="Bekijk voorstel"
                  className={`flex h-7 items-center gap-1 rounded-lg border px-2 text-[10px] font-semibold transition-all ${
                    detailsOpen
                      ? 'border-violet-300 bg-violet-50 text-violet-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700'
                  }`}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Details
                </button>
              )}
              <button
                type="button"
                onClick={() => setNoteOpen(!noteOpen)}
                title="Notitie"
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all ${
                  event.note
                    ? 'border-amber-300 bg-amber-50 text-amber-600'
                    : 'border-gray-200 bg-white text-gray-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                </svg>
              </button>
              <Link
                href={`/admin/clients/${event.clientId}/campagne`}
                className="hidden rounded-lg border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold text-gray-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 group-hover:inline-flex"
              >
                Open
              </Link>
              <button
                type="button"
                onClick={onToggle}
                disabled={pending}
                title={event.seen ? 'Markeer als nieuw' : 'Markeer als gezien'}
                className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-all disabled:opacity-50 ${
                  event.seen
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
                    : 'border-gray-200 bg-white text-gray-400 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600'
                }`}
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={event.seen ? 3 : 2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Existing note display */}
          {event.note && !noteOpen && (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="mt-2 flex items-start gap-1.5 text-left text-xs text-amber-700"
            >
              <svg className="mt-0.5 h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
              </svg>
              <span className="italic">{event.note}</span>
            </button>
          )}
        </div>
      </div>

      {/* Proposal details */}
      {detailsOpen && hasProposalDetails && event.details && (
        <div className="mt-3 ml-11 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-violet-700">Campagnevoorstel</div>
          {event.details.title && (
            <div className="mt-1 text-sm font-semibold text-gray-900">{event.details.title}</div>
          )}
          {event.details.body && (
            <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-700">
              {event.details.body}
            </pre>
          )}
        </div>
      )}

      {/* Note editor */}
      {noteOpen && (
        <div className="mt-3 ml-11 flex items-start gap-2">
          <input
            type="text"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Korte notitie..."
            disabled={savingNote}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote() }}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 shadow-sm transition-all focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-100 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSaveNote}
            disabled={savingNote}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 disabled:opacity-50"
          >
            {noteSaved ? '✓' : 'Opslaan'}
          </button>
          <button
            type="button"
            onClick={() => setNoteOpen(false)}
            className="rounded-lg px-2 py-1.5 text-[11px] text-gray-500 hover:text-gray-700"
          >
            Sluiten
          </button>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  dot,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  dot?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
        active
          ? 'bg-gray-900 text-white shadow-sm'
          : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-gray-300'
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : dot}`} />}
      {label}
      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-gray-100'}`}>
        {count}
      </span>
    </button>
  )
}
