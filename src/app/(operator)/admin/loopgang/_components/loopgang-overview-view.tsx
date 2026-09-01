'use client'

import { useMemo, useState } from 'react'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverview } from '@/lib/data/loopgang-overview'
import { ClientCard } from './client-card'

interface Props {
  overview: LoopgangOverview
}

const WEEKDAY_NAMES = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]
const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

type Focus = 'all' | 'action' | 'invoice' | 'meeting' | 'stalled'

const FOCUS_LABELS: Record<Focus, string> = {
  all: 'Alles',
  action: 'Vraagt actie',
  invoice: 'Factuur open',
  meeting: 'Meeting regelen',
  stalled: 'Staat stil',
}

export function LoopgangOverviewView({ overview }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [focus, setFocus] = useState<Focus>('all')

  const visible = useMemo(() => {
    return overview.clients.filter((client) => {
      if (selected.length > 0 && !selected.includes(client.id)) return false

      switch (focus) {
        case 'action':
          return client.cycle.reminders.some((r) => r.severity !== 'info')
        case 'invoice':
          return client.cycle.reminders.some(
            (r) => r.kind === 'invoice-due' || (r.kind === 'payment-overdue' && r.severity === 'urgent')
          )
        case 'meeting':
          return client.cycle.reminders.some((r) => r.kind === 'meeting-schedule')
        case 'stalled':
          return client.sentOnVolumeDate === 0
        default:
          return true
      }
    })
  }, [overview.clients, selected, focus])

  function toggleClient(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-5">
      {/* Vandaag + kerncijfers */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Vandaag
            </div>
            <div className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">
              {formatToday(overview.today)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {overview.todayIsWorkday
                ? 'Werkdag — verzendvolume telt vandaag mee.'
                : 'Geen werkdag — de volumeteller toont de laatste werkdag.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Stat label="Draait" value={String(overview.totals.running)} tone="ok" />
            <Stat label="Staat stil" value={String(overview.totals.paused)} tone="warn" />
            <Stat label="Factuur te laat" value={String(overview.totals.invoicesDue)} tone="bad" />
            <Stat
              label="Meeting regelen"
              value={String(overview.totals.meetingsToPlan)}
              tone="warn"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 text-[11px]">
          <Pill
            tone={overview.totals.callsToday > 0 ? 'warn' : 'muted'}
            text={`${overview.totals.callsToday} klant(en) vandaag bellen voor een meeting`}
          />
          <Pill
            tone={overview.totals.paymentsOverdue > 0 ? 'bad' : 'muted'}
            text={`${overview.totals.paymentsOverdue} factuur/facturen over de betaaltermijn`}
          />
          <Pill
            tone="muted"
            text={`Openstaand: ${formatEuroCents(overview.totals.openInvoiceCents)}`}
          />
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FOCUS_LABELS) as Focus[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFocus(key)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                focus === key
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {FOCUS_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Klanten
          </span>
          {overview.clients.map((client) => {
            const active = selected.includes(client.id)
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => toggleClient(client.id)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {client.companyName}
              </button>
            )
          })}
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="ml-1 text-[11px] font-semibold text-gray-400 hover:text-gray-900"
            >
              wis selectie
            </button>
          )}
        </div>
      </section>

      {/* Klanten */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-xs font-medium text-gray-500">
            Geen klanten die aan dit filter voldoen.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((client) => (
            <ClientCard key={client.id} client={client} today={overview.today} />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'ok' | 'warn' | 'bad'
}) {
  const color =
    tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-rose-600'
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${value === '0' ? 'text-gray-300' : color}`}>
        {value}
      </div>
    </div>
  )
}

function Pill({ text, tone }: { text: string; tone: 'muted' | 'warn' | 'bad' }) {
  const styles =
    tone === 'bad'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-gray-200 bg-gray-50 text-gray-600'
  return <span className={`rounded-full border px-3 py-1 font-medium ${styles}`}>{text}</span>
}

function formatToday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`
}
