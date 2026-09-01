'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { MEETING_WORKDAY, type LoopgangCycle } from '@/lib/loopgang/cycle'
import type { EventStatus } from '@/lib/loopgang/events'
import type { DayEntry } from './month-grid'
import {
  InvoiceDialog,
  LeadReportDialog,
  MeetingDialog,
  PauseNoteDialog,
  TargetDialog,
  formatDayShort,
} from './dialogs'

type OpenDialog = 'invoice' | 'report' | 'meeting' | 'pause' | 'target'

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

export function DayPanel({ date, today, clients, entries }: Props) {
  const [dialog, setDialog] = useState<{ clientId: string; kind: OpenDialog } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const isFuture = date > today
  const dialogClient = dialog ? clients.find((c) => c.id === dialog.clientId) : undefined

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

      {/* Wat er die dag moet gebeuren of is gebeurd */}
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
                  onOpen={(kind) => setDialog({ clientId: client.id, kind })}
                  today={today}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Verzendvolume van die dag */}
      {!isFuture && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Verzendvolume
          </h3>
          <ul className="mt-2 divide-y divide-gray-100">
            {clients.map((client) => {
              const sent = client.sentByDate[date] ?? 0
              const pct = Math.min(100, Math.round((sent / client.dailySendTarget) * 100))
              const paused = client.pausedDates.includes(date)
              const open = expanded === client.id

              return (
                <li key={client.id} className="py-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : client.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-gray-800">
                        {client.companyName}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-gray-500">
                        {sent.toLocaleString('nl-NL')}
                        <span className="text-gray-300">
                          {' '}
                          / {client.dailySendTarget.toLocaleString('nl-NL')}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${
                          sent === 0
                            ? paused
                              ? 'bg-amber-300'
                              : 'bg-gray-200'
                            : pct >= 70
                              ? 'bg-emerald-500'
                              : 'bg-amber-400'
                        }`}
                        style={{ width: `${sent === 0 && paused ? 100 : pct}%` }}
                      />
                    </div>
                  </button>

                  {open && (
                    <div className="mt-2 rounded-xl bg-gray-50 p-3">
                      <CycleSummary cycle={client.cycle} client={client} />
                      <ClientActions
                        client={client}
                        onOpen={(kind) => setDialog({ clientId: client.id, kind })}
                        today={today}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {dialogClient && dialog?.kind === 'invoice' && (
        <InvoiceDialog client={dialogClient} today={date} onClose={() => setDialog(null)} />
      )}
      {dialogClient && dialog?.kind === 'report' && (
        <LeadReportDialog client={dialogClient} today={date} onClose={() => setDialog(null)} />
      )}
      {dialogClient && dialog?.kind === 'meeting' && (
        <MeetingDialog client={dialogClient} today={today} onClose={() => setDialog(null)} />
      )}
      {dialogClient && dialog?.kind === 'pause' && (
        <PauseNoteDialog client={dialogClient} onClose={() => setDialog(null)} />
      )}
      {dialogClient && dialog?.kind === 'target' && (
        <TargetDialog client={dialogClient} onClose={() => setDialog(null)} />
      )}
    </div>
  )
}

function CycleSummary({
  cycle,
  client,
}: {
  cycle: LoopgangCycle
  client: LoopgangOverviewClient
}) {
  return (
    <dl className="grid grid-cols-2 gap-2 text-[11px]">
      <div>
        <dt className="text-gray-400">Cyclus</dt>
        <dd className="font-medium tabular-nums text-gray-900">
          {cycle.anchor ? `werkdag ${cycle.workday} · dag ${cycle.calendarDay}` : 'geen startpunt'}
        </dd>
      </div>
      <div>
        <dt className="text-gray-400">Commissies</dt>
        <dd className="font-medium tabular-nums text-gray-900">
          {formatEuroCents(client.commissionCentsSinceAnchor)}
          <span className="text-gray-400"> · {client.commissionLeadsSinceAnchor} leads</span>
        </dd>
      </div>
      <div>
        <dt className="text-gray-400">Laatste factuur</dt>
        <dd className="font-medium tabular-nums text-gray-900">
          {client.lastInvoice
            ? `${formatDayShort(client.lastInvoice.invoiceDate)}${
                client.lastInvoice.amountCents === null
                  ? ''
                  : ` · ${formatEuroCents(client.lastInvoice.amountCents)}`
              }`
            : 'geen'}
        </dd>
      </div>
      <div>
        <dt className="text-gray-400">Laatste rapportage</dt>
        <dd className="font-medium tabular-nums text-gray-900">
          {client.lastLeadReport ? formatDayShort(client.lastLeadReport.reportDate) : 'geen'}
        </dd>
      </div>
    </dl>
  )
}

function ClientActions({
  client,
  onOpen,
  today,
}: {
  client: LoopgangOverviewClient
  onOpen: (kind: OpenDialog) => void
  today: string
}) {
  // De meeting-knop verschijnt zodra de belronde loopt, en blijft daarna staan
  // zolang de uitkomst bij deze cyclus hoort — anders is een vergissing niet
  // meer terug te draaien.
  const meetingActionable = client.cycle.workday >= MEETING_WORKDAY || client.meeting !== null

  const leadOverviewHref = client.cycle.anchor
    ? `/admin/commissies/leads?klant=${encodeURIComponent(client.companyName)}&van=${client.cycle.anchor}&tot=${today}`
    : `/admin/commissies/leads?klant=${encodeURIComponent(client.companyName)}`

  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      <button type="button" onClick={() => onOpen('invoice')} className={smallButton}>
        Factuur
      </button>
      <button type="button" onClick={() => onOpen('report')} className={smallButton}>
        Rapportage
      </button>
      {meetingActionable && (
        <button
          type="button"
          onClick={() => onOpen('meeting')}
          className={
            client.meeting
              ? smallButton
              : 'inline-flex items-center rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-gray-800'
          }
        >
          {client.meeting ? 'Meeting aanpassen' : 'Meeting afgehandeld'}
        </button>
      )}
      <button type="button" onClick={() => onOpen('pause')} className={smallButton}>
        Pauzereden
      </button>
      <button type="button" onClick={() => onOpen('target')} className={smallButton}>
        Volumenorm
      </button>
      <Link href={leadOverviewHref} className={smallButton}>
        Leadoverzicht →
      </Link>
      <Link href={`/admin/clients/${client.id}/loopgang`} className={smallButton}>
        Loopgang →
      </Link>
    </div>
  )
}

const smallButton =
  'inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50'

function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`
}
