'use client'

import Link from 'next/link'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { MEETING_WORKDAY } from '@/lib/loopgang/cycle'
import {
  InvoiceDialog,
  LeadReportDialog,
  MeetingDialog,
  CampaignTracksDialog,
  PauseDialog,
  TargetDialog,
  formatDayShort,
} from './dialogs'

/**
 * De knoppenrij en de cyclussamenvatting staan zowel in het dagpaneel als in de
 * klantenstrook onder de kalender. Eén plek, zodat ze niet uit elkaar lopen.
 */

export type OpenDialog = 'invoice' | 'report' | 'meeting' | 'pause' | 'target' | 'campaigns'

export interface DialogState {
  /** De sleutel uit het overzicht, niet het klant-id: één klant kan twee regels hebben. */
  clientKey: string
  kind: OpenDialog
}

export function ClientActions({
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
      <button
        type="button"
        onClick={() => onOpen('pause')}
        className={
          client.isPaused
            ? 'inline-flex items-center rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-amber-600'
            : smallButton
        }
      >
        {client.isPaused ? 'Beëindig pauze' : 'Pauze start'}
      </button>
      <button type="button" onClick={() => onOpen('target')} className={smallButton}>
        Volumenorm
      </button>
      <button type="button" onClick={() => onOpen('campaigns')} className={smallButton}>
        Campagnes
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

export function CycleSummary({ client }: { client: LoopgangOverviewClient }) {
  const { cycle } = client
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

/**
 * Rendert de dialoog die bij `state` hoort. De factuur- en rapportagedialoog
 * krijgen de gekozen kalenderdag als standaarddatum; de meeting rekent tegen
 * vandaag, want die gaat over wat er nú nog moet gebeuren.
 */
export function ClientDialogs({
  state,
  clients,
  today,
  date,
  onClose,
}: {
  state: DialogState | null
  clients: LoopgangOverviewClient[]
  today: string
  date: string
  onClose: () => void
}) {
  const client = state ? clients.find((c) => c.key === state.clientKey) : undefined
  if (!state || !client) return null

  switch (state.kind) {
    case 'invoice':
      return <InvoiceDialog client={client} today={date} onClose={onClose} />
    case 'report':
      return <LeadReportDialog client={client} today={date} onClose={onClose} />
    case 'meeting':
      return <MeetingDialog client={client} today={today} onClose={onClose} />
    case 'pause':
      return <PauseDialog client={client} today={today} onClose={onClose} />
    case 'target':
      return <TargetDialog client={client} onClose={onClose} />
    case 'campaigns':
      return <CampaignTracksDialog client={client} onClose={onClose} />
  }
}

const smallButton =
  'inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50'
