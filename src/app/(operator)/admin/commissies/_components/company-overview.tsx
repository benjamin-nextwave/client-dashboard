'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatEuroCents, MONTHLY_SALARY_CENTS, SALARY_HEADCOUNT } from '@/lib/commissions-shared'
import type { CompanyCommissionOverview } from '@/lib/data/commissions'
import { downloadCsv, centsToCsvAmount } from '@/lib/csv-client'
import { refreshRompslompExpenses } from '../actions'

interface CompanyOverviewProps {
  overview: CompanyCommissionOverview
}

export function CompanyOverview({ overview }: CompanyOverviewProps) {
  const {
    clients,
    totalCommissionCents,
    expensesCents,
    expensesCount,
    expensesError,
    expensesSkipped,
    rentBookings,
    firstRentDate,
    netCents,
    salaryMonths,
    salaryCents,
    afterSalaryCents,
    from,
    to,
  } = overview

  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()
  const [refreshNote, setRefreshNote] = useState<string | null>(null)

  const handleRefresh = () => {
    setRefreshNote(null)
    startRefresh(async () => {
      const result = await refreshRompslompExpenses(from, to)
      if (result.error) {
        setRefreshNote(`Mislukt: ${result.error}`)
        return
      }
      setRefreshNote(
        `Bijgewerkt · ${result.count} ${result.count === 1 ? 'boeking' : 'boekingen'}, ${formatEuroCents(result.totalCents ?? 0)}`
      )
      router.refresh()
    })
  }

  const rentCents = rentBookings.reduce((s, r) => s + r.amountCents, 0)
  const rentBooked = rentBookings.length > 0
  // Vóór de eerste huurfactuur was er geen kantoor; dan is "nog niet geboekt"
  // geen ontbrekende post maar gewoon de werkelijkheid van toen.
  const rentRelevant = firstRentDate !== null && to >= firstRentDate

  const handleDownload = () => {
    const header = ['Klant', 'Eerste lead', 'Leaddagen', 'Commissie (€)']
    const rows: Array<Array<string | number>> = clients.map((c) => [
      c.companyName,
      c.firstLeadDate ?? '',
      c.recordedDays,
      centsToCsvAmount(c.commissionCents),
    ])
    rows.push([])
    rows.push(['Totaal commissies', '', '', centsToCsvAmount(totalCommissionCents)])
    rows.push([
      'Uitgaven (Rompslomp)',
      '',
      '',
      expensesCents === null ? 'onbekend' : '-' + centsToCsvAmount(expensesCents),
    ])
    rows.push(['Netto', '', '', netCents === null ? 'onbekend' : centsToCsvAmount(netCents)])
    rows.push([
      `Salaris (${salaryMonths} mnd x ${SALARY_HEADCOUNT} x ${centsToCsvAmount(MONTHLY_SALARY_CENTS)})`,
      '',
      '',
      '-' + centsToCsvAmount(salaryCents),
    ])
    rows.push([
      'Bedrag over na salaris',
      '',
      '',
      afterSalaryCents === null ? 'onbekend' : centsToCsvAmount(afterSalaryCents),
    ])
    downloadCsv(`commissies-totaal-${from}_tot_${to}.csv`, header, rows)
  }

  return (
    <section className="space-y-4">
      {expensesError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <p className="font-semibold">Uitgaven konden niet worden opgehaald uit Rompslomp.</p>
          <p className="mt-0.5 text-xs">{expensesError}</p>
          <p className="mt-1.5 text-xs">
            Netto en het kwart-aandeel staan daarom op onbekend — er wordt bewust geen nul getoond, want dan zou de
            winst te hoog lijken.{' '}
            <Link href="/admin/commissies/rompslomp" className="font-semibold underline">
              Koppeling controleren
            </Link>
          </p>
        </div>
      )}

      {expensesSkipped > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {expensesSkipped} {expensesSkipped === 1 ? 'boeking is' : 'boekingen zijn'} overgeslagen omdat bedrag of
          datum niet te lezen was. Het uitgaventotaal is dus mogelijk te laag.{' '}
          <Link href="/admin/commissies/rompslomp" className="font-semibold underline">
            Bekijk wat er terugkomt
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {refreshNote && (
          <span
            className={`text-[11px] ${refreshNote.startsWith('Mislukt') ? 'text-rose-600' : 'text-emerald-700'}`}
          >
            {refreshNote}
          </span>
        )}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Haalt de uitgaven opnieuw op bij Rompslomp, zonder te wachten op de cache van 5 minuten"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {isRefreshing ? 'Ophalen…' : 'Ververs uitgaven'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Commissies" value={formatEuroCents(totalCommissionCents)} tone="neutral" />
        <SummaryCard
          label="Uitgaven"
          value={expensesCents === null ? 'Onbekend' : '−' + formatEuroCents(expensesCents)}
          tone={expensesCents === null ? 'muted' : 'cost'}
          note={
            expensesCents === null
              ? 'Rompslomp niet bereikbaar'
              : `${expensesCount} ${expensesCount === 1 ? 'boeking' : 'boekingen'} uit Rompslomp`
          }
        />
        <SummaryCard
          label="Netto"
          value={netCents === null ? 'Onbekend' : formatEuroCents(netCents)}
          tone={netCents === null ? 'muted' : netCents >= 0 ? 'positive' : 'negative'}
        />
        <SummaryCard
          label="Salaris"
          value={'−' + formatEuroCents(salaryCents)}
          tone="cost"
          note={`${salaryMonths} × ${SALARY_HEADCOUNT} × ${formatEuroCents(MONTHLY_SALARY_CENTS)}`}
        />
        <SummaryCard
          label="Bedrag over na salaris"
          value={afterSalaryCents === null ? 'Onbekend' : formatEuroCents(afterSalaryCents)}
          tone={afterSalaryCents === null ? 'muted' : afterSalaryCents >= 0 ? 'positive' : 'negative'}
          emphasis
        />
      </div>

      {expensesCents !== null && rentRelevant && (
        <div
          className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border px-4 py-2.5 text-sm ${
            rentBooked
              ? 'border-gray-200 bg-white text-gray-600'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <span className="font-semibold">Huur</span>
          {rentBooked ? (
            <>
              <span>
                geboekt · {formatEuroCents(rentCents)} op{' '}
                {rentBookings
                  .map((r) => formatShortDate(r.date))
                  .join(', ')}
              </span>
              <span className="text-gray-400">· zit in het uitgaventotaal</span>
            </>
          ) : (
            <>
              <span>staat nog niet in deze periode geboekt.</span>
              <span className="text-xs">
                De uitgaven zijn dus mogelijk te laag en het netto te hoog. De huur wordt meestal aan het eind van
                de maand geboekt.
              </span>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Commissie per klant</h2>
        <button
          type="button"
          onClick={handleDownload}
          disabled={clients.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download CSV
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          Geen commissies in deze periode.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Klant</th>
                <th className="px-4 py-2.5 text-center">Leaddagen</th>
                <th className="px-4 py-2.5 text-right">Commissie</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.clientId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/clients/${c.clientId}/commissies`}
                      className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      {c.companyName}
                    </Link>
                    {c.firstLeadDate && (
                      <div className="text-[11px] text-gray-400">eerste lead {formatShortDate(c.firstLeadDate)}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums text-gray-600">{c.recordedDays}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">
                    {formatEuroCents(c.commissionCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-gray-400">
        Uitgaven zijn bedrijfsbreed en horen niet bij één klant, dus deze tabel toont alleen wat een klant opbrengt.
        Wat er onder de streep overblijft staat in de blokken hierboven.
      </p>
    </section>
  )
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(date + 'T00:00:00')
  )
}

function SummaryCard({
  label,
  value,
  tone,
  note,
  emphasis = false,
}: {
  label: string
  value: string
  tone: 'neutral' | 'cost' | 'positive' | 'negative' | 'muted'
  note?: string
  emphasis?: boolean
}) {
  const valueClass = {
    neutral: 'text-gray-900',
    cost: 'text-rose-600',
    positive: 'text-emerald-700',
    negative: 'text-rose-700',
    muted: 'text-gray-400',
  }[tone]
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        emphasis ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
      {note && <div className="mt-0.5 text-[11px] text-gray-400">{note}</div>}
    </div>
  )
}
