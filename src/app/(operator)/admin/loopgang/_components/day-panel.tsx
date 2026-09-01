'use client'

import { useState } from 'react'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import type { EventStatus } from '@/lib/loopgang/events'
import type { DayEntry } from './month-grid'
import {
  ClientActions,
  ClientDialogs,
  type DialogState,
  type OpenDialog,
} from './client-actions'

interface Props {
  date: string
  today: string
  /** Alle klanten die door het filter komen, in urgentievolgorde. */
  clients: LoopgangOverviewClient[]
  /** De gebeurtenissen van deze dag, in dezelfde volgorde. */
  entries: DayEntry[]
}

const STATUS_DOT: Record<EventStatus, string> = {
  done: 'bg-gray-300',
  overdue: 'bg-rose-500',
  due: 'bg-amber-500',
  upcoming: 'bg-indigo-400',
}

const STATUS_LABEL: Record<EventStatus, string> = {
  done: 'gebeurd',
  overdue: 'te laat',
  due: 'vandaag',
  upcoming: 'staat gepland',
}

const WEEKDAY_NAMES = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]
const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/**
 * Wat er op de gekozen dag moet gebeuren of is gebeurd. De klantenlijst met de
 * volumecijfers staat niet hier maar onder de kalender, in ClientStrip.
 */
export function DayPanel({ date, today, clients, entries }: Props) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  const isFuture = date > today

  // Gebeurtenissen per klant, in de volgorde waarin de klanten staan.
  const byClient = clients
    .map((client) => ({
      client,
      events: entries.filter((e) => e.client.id === client.id).map((e) => e.event),
    }))
    .filter((group) => group.events.length > 0)

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {date === today ? 'Vandaag' : isFuture ? 'Staat gepland' : 'Geweest'}
        </div>
        <div className="mt-0.5 text-sm font-semibold text-gray-900">{formatDayLong(date)}</div>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Op deze dag
        </h3>

        {byClient.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500">Niets te doen, niets gebeurd.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {byClient.map(({ client, events }) => (
              <li key={client.id} className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-900">{client.companyName}</span>
                  {client.cycle.anchor && (
                    <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                      werkdag {client.cycle.workday}
                    </span>
                  )}
                </div>

                <ul className="mt-1.5 space-y-1">
                  {events.map((event) => (
                    <li key={event.kind} className="flex items-start gap-2 text-[11px]">
                      <span
                        aria-hidden
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status]}`}
                      />
                      <span className="text-gray-800">
                        <span className="font-medium">{event.label}</span>
                        <span className="text-gray-400"> · {STATUS_LABEL[event.status]}</span>
                        {event.detail && <span className="text-gray-500"> · {event.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ul>

                <ClientActions
                  client={client}
                  today={today}
                  onOpen={(kind: OpenDialog) => setDialog({ clientId: client.id, kind })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClientDialogs
        state={dialog}
        clients={clients}
        today={today}
        date={date}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}

function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`
}
