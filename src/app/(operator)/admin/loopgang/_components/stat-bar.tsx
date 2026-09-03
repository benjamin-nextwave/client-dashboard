'use client'

import { useState } from 'react'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverview, LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import {
  INVOICE_WORKDAY,
  PAYMENT_TERM_DAYS,
  addDays,
  countWorkdays,
  daysBetween,
} from '@/lib/loopgang/cycle'
import { formatDayShort } from './dialogs'

/**
 * De kerncijfers, en achter elk cijfer de klanten die het opmaken.
 *
 * Vier vakken die samen de hele klantenlijst afdekken: wie er draait, wie er
 * bewust stilstaat, en wie er nog nooit een periode heeft gehad. Plus het geld
 * dat openstaat.
 *
 * Een getal is een doodlopend spoor zolang je niet ziet wie erachter zit. Klik
 * je op een cijfer, dan klapt de lijst eronder uit met per klant het getal dat
 * ertoe doet; klik je op een klant, dan springt de kalender op zijn periode.
 *
 * Dat een klant stilstaat is geen eigen vak meer maar een regel bij "Draait" —
 * anders zou hij uit het overzicht verdwijnen op het moment dat er iets mis is.
 */

type StatKey = 'running' | 'paused' | 'never' | 'open'

const STAT_LABELS: Record<StatKey, string> = {
  running: 'Draait',
  paused: 'Staat op pauze',
  never: 'Nooit live geweest',
  open: 'Openstaand',
}

/** Eén regel in een uitgeklapte lijst: de klant plus waarom hij erin staat. */
interface StatRow {
  client: LoopgangOverviewClient
  detail: string
}

interface Props {
  /** Alle klanten, niet de gefilterde: een kerncijfer telt over het geheel. */
  clients: LoopgangOverviewClient[]
  totals: LoopgangOverview['totals']
  today: string
  activeClientKey: string | null
  onSelectClient: (key: string) => void
}

export function StatBar({ clients, totals, today, activeClientKey, onSelectClient }: Props) {
  const [open, setOpen] = useState<StatKey | null>(null)

  const rows = open ? rowsFor(open, clients, today) : []

  // Hoeveel van de draaiende klanten er feitelijk stilstaan. Dat was een eigen
  // tegel; nu staat het als bijregel bij "Draait" en per klant in de lijst —
  // dezelfde informatie, één kader minder.
  const stilCount = clients.filter(
    (c) => c.cycle.anchor !== null && !c.isPaused && c.stoppedOn === null && c.isStalled
  ).length

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Eén rij, haarlijnen ertussen: het zijn zes waarden van dezelfde soort
          en geen zes losse mededelingen. */}
      <div className="grid grid-cols-2 sm:divide-x sm:divide-gray-100 lg:grid-cols-4">
        <Stat
          statKey="running"
          value={rowsFor('running', clients, today).length}
          tone="ok"
          open={open}
          onToggle={setOpen}
          hint={stilCount === 0 ? 'allemaal aan het versturen' : `${stilCount} staat stil`}
        />
        <Stat
          statKey="paused"
          value={rowsFor('paused', clients, today).length}
          tone="warn"
          open={open}
          onToggle={setOpen}
        />
        <Stat
          statKey="never"
          value={rowsFor('never', clients, today).length}
          tone="muted"
          open={open}
          onToggle={setOpen}
          hint="geen cyclusstart gezet"
        />
        <Stat
          statKey="open"
          text={formatEuroCents(totals.openInvoiceCents)}
          tone={totals.paymentsOverdue > 0 ? 'bad' : 'muted'}
          open={open}
          onToggle={setOpen}
          hint={
            totals.paymentsOverdue > 0
              ? `${totals.paymentsOverdue} over de termijn`
              : 'binnen de termijn'
          }
        />
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-gray-50/70 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              {STAT_LABELS[open]} · {rows.length} {rows.length === 1 ? 'klant' : 'klanten'}
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-gray-900"
            >
              sluiten
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="mt-2 text-[11px] text-gray-400">Er valt hier niemand onder.</p>
          ) : (
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(({ client, detail }) => {
                const actief = client.key === activeClientKey
                return (
                  <button
                    key={client.key}
                    type="button"
                    onClick={() => onSelectClient(client.key)}
                    className={`flex items-start gap-2 rounded-lg border bg-white px-3 py-2 text-left transition-colors ${
                      actief
                        ? 'border-gray-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: client.primaryColor }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold text-gray-900">
                        {client.displayName}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                        {detail}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * Eén kerncijfer. Een getal van nul blijft grijs: nul openstaande facturen is
 * goed nieuws en hoort niet te schreeuwen.
 */
function Stat({
  statKey,
  value,
  text,
  tone,
  hint,
  open,
  onToggle,
}: {
  statKey: StatKey
  value?: number
  text?: string
  tone: 'ok' | 'warn' | 'bad' | 'muted'
  hint?: string
  open: StatKey | null
  onToggle: (key: StatKey | null) => void
}) {
  const leeg = value === 0
  const actief = open === statKey
  const color =
    leeg || tone === 'muted'
      ? 'text-gray-900'
      : tone === 'ok'
        ? 'text-emerald-600'
        : tone === 'warn'
          ? 'text-amber-600'
          : 'text-rose-600'

  return (
    <button
      type="button"
      onClick={() => onToggle(actief ? null : statKey)}
      aria-expanded={actief}
      className={`border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 sm:border-b-0 ${
        actief ? 'bg-gray-100' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {STAT_LABELS[statKey]}
        <svg
          className={`h-2.5 w-2.5 transition-transform ${actief ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={3}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
      <div
        className={`mt-0.5 text-xl font-semibold tabular-nums tracking-tight ${
          leeg ? 'text-gray-300' : color
        }`}
      >
        {text ?? value}
      </div>
      {hint && <div className="text-[10px] text-gray-400">{hint}</div>}
    </button>
  )
}

/** De klanten achter één kerncijfer, met de toelichting die bij dat cijfer past. */
function rowsFor(key: StatKey, clients: LoopgangOverviewClient[], today: string): StatRow[] {
  switch (key) {
    case 'running':
      // Iedereen met een lopende periode die niet gepauzeerd is. Of hij ook
      // daadwerkelijk verstuurt staat per klant in de toelichting — een klant
      // die stilvalt hoort in deze lijst op te vallen, niet eruit te verdwijnen.
      return clients
        .filter((c) => c.cycle.anchor !== null && !c.isPaused && c.stoppedOn === null)
        .map((c) => ({ client: c, detail: runningDetail(c, today) }))

    case 'paused':
      return clients
        .filter((c) => c.isPaused)
        .map((c) => ({ client: c, detail: pausedDetail(c, today) }))

    case 'never':
      return clients
        .filter((c) => c.cycle.anchor === null)
        .map((c) => ({ client: c, detail: neverDetail(c) }))

    case 'open':
      return clients
        .filter((c) => c.invoices.some((i) => !i.paidAt))
        .map((c) => ({ client: c, detail: openDetail(c, today) }))
  }
}

/**
 * Hoe lang een klant al meedraait, en of hij dat ook echt doet.
 *
 * De werkdag van de cyclus zegt wanneer de factuur moet; de werkdagen sinds de
 * livegang zeggen hoe lang hij al klant is. Staat hij stil, dan staat dat
 * vooraan — dat is het enige wat je op dat moment nog wil weten.
 */
function runningDetail(client: LoopgangOverviewClient, today: string): string {
  const delen: string[] = []

  if (client.isStalled) delen.push(stalledDetail(client, today))

  delen.push(`werkdag ${client.cycle.workday} van ${INVOICE_WORKDAY}`)

  if (client.goLiveDate && client.goLiveDate <= today) {
    delen.push(`${plural(countWorkdays(client.goLiveDate, today), 'werkdag', 'werkdagen')} live`)
  }

  const factuur = invoiceDetail(client, today)
  if (factuur) delen.push(factuur)

  return delen.join(' · ')
}

/** Hoe lang er al niets is verstuurd, geteld in werkdagen na de laatste zending. */
function stalledDetail(client: LoopgangOverviewClient, today: string): string {
  if (!client.lastSendDate) return 'geen verzending in beeld'

  const stil = countWorkdays(addDays(client.lastSendDate, 1), today)
  return `STAAT STIL — ${plural(stil, 'werkdag', 'werkdagen')} sinds ${formatDayShort(
    client.lastSendDate
  )}`
}

/** Sinds wanneer de pauze loopt, en waarom. */
function pausedDetail(client: LoopgangOverviewClient, today: string): string {
  const delen: string[] = []

  if (client.pausedSince) {
    const dagen = daysBetween(client.pausedSince, today)
    delen.push(
      `${plural(dagen, 'dag', 'dagen')} · sinds ${formatDayShort(client.pausedSince)}`
    )
  } else {
    delen.push('sinds onbekend')
  }

  if (client.cycle.anchor) delen.push(`stond op werkdag ${client.cycle.workday}`)

  const reden = client.lastPause?.note?.trim()
  if (reden) delen.push(`"${reden}"`)

  return delen.join(' · ')
}

/**
 * Waarom er niets geteld wordt. Zonder cyclusstart loopt er geen periode, dus
 * geen werkdagteller en geen factuurmoment. De laatste factuur staat erbij als
 * aanknopingspunt voor de vraag of hier ooit iets gedraaid heeft.
 */
function neverDetail(client: LoopgangOverviewClient): string {
  const delen = ['geen cyclusstart']

  if (client.lastInvoice) {
    delen.push(`laatste factuur ${formatDayShort(client.lastInvoice.invoiceDate)}`)
  } else {
    delen.push('nooit gefactureerd')
  }

  if (client.goLiveDate) delen.push(`livegang ${formatDayShort(client.goLiveDate)}`)

  return delen.join(' · ')
}

/**
 * Wat er met de factuur mis is: hij is nog niet de deur uit, of hij is niet
 * betaald. Geeft null als er niets aan de hand is.
 */
function invoiceDetail(client: LoopgangOverviewClient, today: string): string | null {
  const delen: string[] = []
  const { cycle } = client

  if (cycle.reminders.some((r) => r.kind === 'paused-uninvoiced')) {
    delen.push('factuur niet verzonden')
  } else if (cycle.reminders.some((r) => r.kind === 'invoice-due')) {
    const over = cycle.invoiceDueDate
      ? Math.max(0, countWorkdays(cycle.invoiceDueDate, today) - 1)
      : 0
    delen.push(
      over === 0
        ? `vandaag is werkdag ${INVOICE_WORKDAY}`
        : `factuur ${plural(over, 'werkdag', 'werkdagen')} te laat`
    )
  }

  const oudste = oldestUnpaid(client)
  if (oudste) {
    const open = daysBetween(oudste, today)
    if (open > PAYMENT_TERM_DAYS) {
      delen.push(`niet betaald — ${plural(open - PAYMENT_TERM_DAYS, 'dag', 'dagen')} over termijn`)
    }
  }

  return delen.length > 0 ? delen.join(' · ') : null
}

/** Hoeveel er openstaat, en of de oudste factuur nog binnen de termijn valt. */
function openDetail(client: LoopgangOverviewClient, today: string): string {
  const bedrag = client.invoices
    .filter((i) => !i.paidAt)
    .reduce((sum, i) => sum + (i.amountCents ?? 0), 0)

  const delen = [`${formatEuroCents(bedrag)} open`]

  if (client.stoppedOn) delen.push(`GESTOPT op ${formatDayShort(client.stoppedOn)}`)

  const oudste = oldestUnpaid(client)
  if (oudste) {
    const dagen = daysBetween(oudste, today)
    delen.push(
      dagen > PAYMENT_TERM_DAYS
        ? `${plural(dagen - PAYMENT_TERM_DAYS, 'dag', 'dagen')} over de termijn`
        : `verstuurd ${formatDayShort(oudste)} · termijn loopt nog`
    )
  }

  return delen.join(' · ')
}

/** De datum van de oudste onbetaalde factuur; die bepaalt de termijn. */
function oldestUnpaid(client: LoopgangOverviewClient): string | null {
  return client.invoices
    .filter((i) => !i.paidAt)
    .reduce<string | null>((acc, i) => (acc === null || i.invoiceDate < acc ? i.invoiceDate : acc), null)
}

function plural(n: number, enkel: string, meer: string): string {
  return `${n} ${n === 1 ? enkel : meer}`
}
