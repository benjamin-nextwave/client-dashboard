'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverviewClient, OverviewDay } from '@/lib/data/loopgang-overview'
import {
  INVOICE_WORKDAY,
  MEETING_WINDOW_FROM,
  MEETING_WINDOW_TO,
  MEETING_WORKDAY,
  daysBetween,
  type LoopgangReminder,
} from '@/lib/loopgang/cycle'
import {
  InvoiceDialog,
  LeadReportDialog,
  MeetingDialog,
  PauseNoteDialog,
  TargetDialog,
  formatDayShort,
} from './dialogs'

type OpenDialog = 'invoice' | 'report' | 'meeting' | 'pause' | 'target' | null

interface Props {
  client: LoopgangOverviewClient
  today: string
}

/** De tijdlijn loopt tot en met de factuurdag van de ideale cyclus. */
const TIMELINE_DAYS = MEETING_WINDOW_TO

const DAY_COLORS: Record<OverviewDay['state'], string> = {
  live: 'bg-emerald-500',
  paused: 'bg-amber-400',
  quiet: 'bg-gray-300',
  weekend: 'bg-gray-100',
}

const SEVERITY_STYLES: Record<LoopgangReminder['severity'], string> = {
  urgent: 'border-rose-200 bg-rose-50 text-rose-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-gray-200 bg-gray-50 text-gray-700',
}

export function ClientCard({ client, today }: Props) {
  const [dialog, setDialog] = useState<OpenDialog>(null)

  const isRunning = client.sentOnVolumeDate > 0
  const pct = Math.min(100, Math.round((client.sentOnVolumeDate / client.dailySendTarget) * 100))
  const volumeTone =
    client.sentOnVolumeDate === 0
      ? 'bg-gray-300'
      : pct >= 70
        ? 'bg-emerald-500'
        : 'bg-amber-400'

  const pausedDays = client.pausedSince ? daysBetween(client.pausedSince, today) : null

  // De meeting-knop verschijnt zodra de belronde loopt, en blijft daarna staan
  // zolang de uitkomst bij deze cyclus hoort — anders is een vergissing niet
  // meer terug te draaien.
  const meetingActionable = client.cycle.workday >= MEETING_WORKDAY || client.meeting !== null

  const leadOverviewHref = client.cycle.anchor
    ? `/admin/commissies/leads?klant=${encodeURIComponent(client.companyName)}&van=${client.cycle.anchor}&tot=${today}`
    : `/admin/commissies/leads?klant=${encodeURIComponent(client.companyName)}`

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5">
      {/* Kop */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                isRunning ? 'bg-emerald-500' : client.isPaused ? 'bg-amber-400' : 'bg-gray-300'
              }`}
            />
            <h2 className="truncate text-sm font-semibold text-gray-900">{client.companyName}</h2>
            {client.isOnboarding && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                onboarding
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            {isRunning
              ? `Draait — ${client.sendingCampaigns} van ${client.campaigns.length} campagne(s) verstuurt`
              : client.isPaused
                ? `Gepauzeerd${pausedDays !== null ? ` sinds ${pausedDays} dag${pausedDays === 1 ? '' : 'en'}` : ''}`
                : 'Geen verzending op deze dag'}
          </p>
        </div>

        <div className="text-right">
          {client.cycle.anchor ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Werkdag {client.cycle.workday} van de cyclus
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                vanaf {formatDayShort(client.cycle.anchor)}{' '}
                {client.cycle.anchorSource === 'invoice' ? '(laatste factuur)' : '(livegang)'}
              </div>
            </>
          ) : (
            <div className="text-[11px] text-gray-400">Geen startpunt bekend</div>
          )}
        </div>
      </div>

      {/* Volume */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tabular-nums text-gray-900">
              {client.sentOnVolumeDate.toLocaleString('nl-NL')}
            </span>
            <span className="text-xs font-medium tabular-nums text-gray-400">
              / {client.dailySendTarget.toLocaleString('nl-NL')}
            </span>
            <button
              type="button"
              onClick={() => setDialog('target')}
              className="ml-1 text-[10px] font-semibold text-gray-400 hover:text-gray-700"
            >
              wijzig
            </button>
          </div>
          <div className="text-right text-[11px] text-gray-500">
            <div>
              {client.volumeDateIsToday
                ? 'vandaag'
                : `laatste werkdag (${formatDayShort(client.volumeDate)})`}
            </div>
            <div className="tabular-nums text-gray-400">
              vorige werkdag {client.sentPreviousWorkday.toLocaleString('nl-NL')}
            </div>
          </div>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${volumeTone}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Laatste 14 dagen */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          <span>Laatste 14 dagen</span>
          <span className="font-normal normal-case tracking-normal text-gray-400">
            groen = verstuurd · oranje = gepauzeerd
          </span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {client.recentDays.map((day) => (
            <div
              key={day.date}
              title={`${formatDayShort(day.date)} — ${day.sent.toLocaleString('nl-NL')} verstuurd`}
              className={`h-5 flex-1 rounded-sm ${DAY_COLORS[day.state]}`}
            />
          ))}
        </div>
      </div>

      {/* Cyclus */}
      {client.cycle.anchor && <CycleTimeline client={client} />}

      {/* Cijfers */}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Commissies deze cyclus
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
            {formatEuroCents(client.commissionCentsSinceAnchor)}
          </dd>
          <dd className="text-[11px] tabular-nums text-gray-500">
            {client.commissionLeadsSinceAnchor} lead
            {client.commissionLeadsSinceAnchor === 1 ? '' : 's'}
          </dd>
        </div>

        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Laatste factuur
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
            {client.lastInvoice
              ? client.lastInvoice.amountCents === null
                ? '—'
                : formatEuroCents(client.lastInvoice.amountCents)
              : 'geen'}
          </dd>
          <dd className="text-[11px] text-gray-500">
            {client.lastInvoice ? (
              <>
                {formatDayShort(client.lastInvoice.invoiceDate)} ·{' '}
                <span className={client.lastInvoice.paidAt ? 'text-emerald-600' : 'text-amber-600'}>
                  {client.lastInvoice.paidAt
                    ? `betaald ${formatDayShort(client.lastInvoice.paidAt)}`
                    : 'open'}
                </span>
              </>
            ) : (
              'nog niet gefactureerd'
            )}
          </dd>
        </div>

        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Laatste leadrapportage
          </dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
            {client.lastLeadReport ? formatDayShort(client.lastLeadReport.reportDate) : 'geen'}
          </dd>
          <dd className="text-[11px] text-gray-500">
            {client.lastLeadReport?.pdfUrl ? (
              <a
                href={client.lastLeadReport.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-indigo-600 hover:underline"
              >
                PDF openen
              </a>
            ) : (
              'geen PDF'
            )}
          </dd>
        </div>
      </dl>

      {/* Herinneringen */}
      {client.cycle.reminders.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {client.cycle.reminders.map((reminder) => (
            <li
              key={`${reminder.kind}-${reminder.title}`}
              className={`rounded-xl border px-3 py-2 text-[11px] ${SEVERITY_STYLES[reminder.severity]}`}
            >
              <span className="font-semibold">{reminder.title}</span>
              {reminder.detail && <span className="ml-1.5 opacity-80">{reminder.detail}</span>}
            </li>
          ))}
        </ul>
      )}

      {client.meeting && (
        <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
          <span className="font-semibold">Meeting afgehandeld:</span>{' '}
          {client.meeting.outcome === 'planned'
            ? `gepland op ${client.meeting.meetingDate ? formatDayShort(client.meeting.meetingDate) : 'onbekende datum'}`
            : client.meeting.outcome === 'stop'
              ? 'geen meeting — klant stoppen'
              : 'geen meeting — klant doorpakken'}
          {client.meeting.note && <span className="opacity-80"> · {client.meeting.note}</span>}
        </p>
      )}

      {client.analyticsError && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          Instantly-cijfers onvolledig: {client.analyticsError}
        </p>
      )}

      {/* Knoppen */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <button type="button" onClick={() => setDialog('invoice')} className={actionButton}>
          Factuur toevoegen
        </button>
        <button type="button" onClick={() => setDialog('report')} className={actionButton}>
          Leadrapportage
        </button>
        {meetingActionable && (
          <button
            type="button"
            onClick={() => setDialog('meeting')}
            className={
              client.meeting
                ? actionButton
                : 'inline-flex items-center rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-gray-800'
            }
          >
            {client.meeting ? 'Meeting aanpassen' : 'Meeting is afgehandeld'}
          </button>
        )}
        <button type="button" onClick={() => setDialog('pause')} className={actionButton}>
          Pauzereden
        </button>
        <Link href={leadOverviewHref} className={actionButton}>
          Leadoverzicht →
        </Link>
        <Link href={`/admin/clients/${client.id}/loopgang`} className={actionButton}>
          Volledige loopgang →
        </Link>
      </div>

      {dialog === 'invoice' && (
        <InvoiceDialog client={client} today={today} onClose={() => setDialog(null)} />
      )}
      {dialog === 'report' && (
        <LeadReportDialog client={client} today={today} onClose={() => setDialog(null)} />
      )}
      {dialog === 'meeting' && (
        <MeetingDialog client={client} today={today} onClose={() => setDialog(null)} />
      )}
      {dialog === 'pause' && <PauseNoteDialog client={client} onClose={() => setDialog(null)} />}
      {dialog === 'target' && <TargetDialog client={client} onClose={() => setDialog(null)} />}
    </article>
  )
}

const actionButton =
  'inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50'

/**
 * De ideale cyclus als balk: dag 1 tot en met dag 31, met het meetingvenster en
 * de factuurdag erin. De ruit is waar we vandaag staan. Loopt de cyclus over dag
 * 31 heen, dan blijft de ruit rechts staan — dat is precies het signaal dat er
 * te lang niet gefactureerd is.
 */
function CycleTimeline({ client }: { client: LoopgangOverviewClient }) {
  const { cycle } = client
  const position = Math.min(100, Math.max(0, ((cycle.calendarDay - 1) / (TIMELINE_DAYS - 1)) * 100))

  const windowFrom = ((MEETING_WINDOW_FROM - 1) / (TIMELINE_DAYS - 1)) * 100
  const windowTo = ((MEETING_WINDOW_TO - 1) / (TIMELINE_DAYS - 1)) * 100

  const overdue = cycle.calendarDay > TIMELINE_DAYS

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        <span>Ideale cyclus</span>
        <span className="font-normal normal-case tracking-normal">
          dag {cycle.calendarDay} · werkdag {MEETING_WORKDAY} mailen, werkdag {INVOICE_WORKDAY}{' '}
          factureren
        </span>
      </div>

      <div className="relative mt-2 h-2 w-full rounded-full bg-gray-100">
        {/* Meetingvenster, dag 23 t/m 31 */}
        <div
          className="absolute inset-y-0 rounded-full bg-indigo-100"
          style={{ left: `${windowFrom}%`, width: `${Math.max(2, windowTo - windowFrom)}%` }}
        />
        {/* Vandaag */}
        <div
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] ${
            overdue ? 'bg-rose-500' : 'bg-gray-900'
          }`}
          style={{ left: `${position}%` }}
        />
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>dag 1 start</span>
        <span>dag {MEETING_WINDOW_FROM}–{MEETING_WINDOW_TO} meeting</span>
        <span>rapportage + factuur</span>
      </div>
    </div>
  )
}
