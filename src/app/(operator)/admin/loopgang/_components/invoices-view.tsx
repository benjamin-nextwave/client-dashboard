'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverviewClient, OverviewInvoice } from '@/lib/data/loopgang-overview'
import { PAYMENT_TERM_DAYS, addDays, daysBetween } from '@/lib/loopgang/cycle'
import { deleteInvoiceAction, saveInvoiceAction, setInvoicePaidAction } from '../actions'
import { formatDayShort } from './dialogs'

/**
 * Facturen, met de hand bijgehouden.
 *
 * Ze kwamen een tijdje uit Rompslomp, maar daar staat alleen óf een factuur
 * betaald is en niet wanneer. Dat leverde een hele reeks facturen op die
 * allemaal op dezelfde dag betaald zouden zijn, en een verzonnen datum is erger
 * dan geen: hij ziet er even echt uit als een goede en de betaaltermijn wordt
 * eruit berekend. Vandaar dat de koppeling eruit is en dit tabblad ervoor in de
 * plaats komt.
 *
 * De betaaltermijn is veertien dagen na de factuurdatum. Die telt hier af, zodat
 * je in één blik ziet wie er te laat is.
 */

type Filter = 'open' | 'betaald' | 'alles'

const FILTER_LABELS: Record<Filter, string> = {
  open: 'Openstaand',
  betaald: 'Betaald',
  alles: 'Alles',
}

interface Rij {
  client: LoopgangOverviewClient
  invoice: OverviewInvoice
  /** Dagen over de betaaltermijn; nul of minder betekent nog binnen de tijd. */
  overTermijn: number
}

export function InvoicesView({
  clients,
  today,
}: {
  clients: LoopgangOverviewClient[]
  today: string
}) {
  const [filter, setFilter] = useState<Filter>('open')
  const [toevoegen, setToevoegen] = useState(false)

  const rijen = useMemo(() => {
    const uit: Rij[] = []
    for (const client of clients) {
      for (const invoice of client.invoices) {
        uit.push({
          client,
          invoice,
          overTermijn: invoice.paidAt
            ? 0
            : daysBetween(addDays(invoice.invoiceDate, PAYMENT_TERM_DAYS), today),
        })
      }
    }
    return uit.sort((a, b) => b.invoice.invoiceDate.localeCompare(a.invoice.invoiceDate))
  }, [clients, today])

  const zichtbaar = rijen.filter((r) =>
    filter === 'alles' ? true : filter === 'betaald' ? r.invoice.paidAt : !r.invoice.paidAt
  )

  const openCents = rijen
    .filter((r) => !r.invoice.paidAt)
    .reduce((sum, r) => sum + (r.invoice.amountCents ?? 0), 0)
  const teLaat = rijen.filter((r) => !r.invoice.paidAt && r.overTermijn > 0).length

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Facturen</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            <span className="font-semibold tabular-nums text-gray-900">
              {formatEuroCents(openCents)}
            </span>{' '}
            openstaand over {rijen.filter((r) => !r.invoice.paidAt).length} facturen
            {teLaat > 0 && (
              <span className="font-semibold text-rose-600"> · {teLaat} over de termijn</span>
            )}
            {' · betaaltermijn is '}
            {PAYMENT_TERM_DAYS} dagen
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setToevoegen((v) => !v)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
          >
            {toevoegen ? 'Annuleren' : 'Factuur toevoegen'}
          </button>
        </div>
      </header>

      {toevoegen && (
        <NieuweFactuur clients={clients} today={today} onKlaar={() => setToevoegen(false)} />
      )}

      {zichtbaar.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
          {rijen.length === 0
            ? 'Er staan nog geen facturen in. Voeg er een toe met de knop hierboven.'
            : 'Niets in dit filter.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Klant</th>
                <th className="px-4 py-2">Factuurdatum</th>
                <th className="px-4 py-2 text-right">Bedrag excl.</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {zichtbaar.map((rij) => (
                <FactuurRij key={rij.invoice.id} rij={rij} today={today} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FactuurRij({ rij, today }: { rij: Rij; today: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const { client, invoice, overTermijn } = rij

  function zetBetaald(paidAt: string | null) {
    setError(null)
    startTransition(async () => {
      const result = await setInvoicePaidAction(invoice.id, client.id, paidAt)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function verwijder() {
    setError(null)
    startTransition(async () => {
      const result = await deleteInvoiceAction(invoice.id, client.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <tr className="align-middle">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: client.primaryColor }}
          />
          <span className="text-xs font-semibold text-gray-900">{client.displayName}</span>
        </div>
        {invoice.note && (
          <div className="mt-0.5 max-w-xs truncate text-[10px] text-gray-400">{invoice.note}</div>
        )}
        {error && <div className="mt-0.5 text-[10px] font-medium text-amber-700">{error}</div>}
      </td>

      <td className="px-4 py-2.5 text-[11px] tabular-nums text-gray-700">
        {formatDayShort(invoice.invoiceDate)}
        <div className="text-[10px] text-gray-400">
          termijn tot {formatDayShort(addDays(invoice.invoiceDate, PAYMENT_TERM_DAYS))}
        </div>
      </td>

      <td className="px-4 py-2.5 text-right text-[11px] font-semibold tabular-nums text-gray-900">
        {invoice.amountCents === null ? '—' : formatEuroCents(invoice.amountCents)}
      </td>

      <td className="px-4 py-2.5">
        {invoice.paidAt ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            betaald {formatDayShort(invoice.paidAt)}
          </span>
        ) : overTermijn > 0 ? (
          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
            {overTermijn} {overTermijn === 1 ? 'dag' : 'dagen'} over de termijn
          </span>
        ) : (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
            open · nog {-overTermijn} {-overTermijn === 1 ? 'dag' : 'dagen'}
          </span>
        )}
      </td>

      <td className="px-4 py-2.5">
        <div className="flex items-center justify-end gap-3">
          <BetaaldSchakelaar
            betaald={invoice.paidAt !== null}
            pending={pending}
            onWissel={(aan) => zetBetaald(aan ? today : null)}
          />

          {/* Kwam het geld op een andere dag binnen, dan corrigeer je de datum
              hier. Alleen zichtbaar als hij op betaald staat: een datumveld bij
              een onbetaalde factuur nodigt uit tot een gok. */}
          {invoice.paidAt && (
            <input
              type="date"
              value={invoice.paidAt}
              onChange={(e) => e.target.value && zetBetaald(e.target.value)}
              disabled={pending}
              className="rounded-lg border border-gray-200 px-2 py-1 text-[10px] text-gray-600 outline-none focus:border-emerald-400 disabled:opacity-50"
            />
          )}

          <button
            type="button"
            onClick={verwijder}
            disabled={pending}
            className="text-[10px] font-semibold text-gray-300 transition-colors hover:text-rose-600 disabled:opacity-50"
          >
            verwijderen
          </button>
        </div>
      </td>
    </tr>
  )
}

/**
 * De schakelaar tussen niet betaald en betaald.
 *
 * Rood staat links en groen rechts, en de knop draagt zijn eigen tekst. Een
 * schakelaar zonder woorden dwingt je elke keer opnieuw te bedenken welke kant
 * "aan" is; hier lees je het gewoon.
 */
function BetaaldSchakelaar({
  betaald,
  pending,
  onWissel,
}: {
  betaald: boolean
  pending: boolean
  onWissel: (aan: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={betaald}
      disabled={pending}
      onClick={() => onWissel(!betaald)}
      className={`inline-flex items-center gap-1.5 rounded-full px-1 py-1 pr-2.5 text-[10px] font-semibold transition-colors disabled:opacity-50 ${
        betaald
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
      }`}
    >
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          betaald ? 'bg-emerald-600' : 'bg-rose-500'
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
            betaald ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
      {betaald ? 'Betaald' : 'Niet betaald'}
    </button>
  )
}

function NieuweFactuur({
  clients,
  today,
  onKlaar,
}: {
  clients: LoopgangOverviewClient[]
  today: string
  onKlaar: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [clientId, setClientId] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(formData: FormData) {
    if (!clientId) {
      setError('Kies een klant.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await saveInvoiceAction(clientId, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onKlaar()
    })
  }

  return (
    <form
      action={submit}
      className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-4"
    >
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor="factuur-klant">
          Klant
        </label>
        <select
          id="factuur-klant"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={`mt-1 ${fieldClass}`}
        >
          <option value="">Kies een klant…</option>
          {clients.map((c) => (
            <option key={c.key} value={c.id}>
              {c.displayName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="invoiceDate">
          Factuurdatum
        </label>
        <input
          id="invoiceDate"
          name="invoiceDate"
          type="date"
          defaultValue={today}
          className={`mt-1 ${fieldClass}`}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="amount">
          Bedrag excl. btw
        </label>
        <input
          id="amount"
          name="amount"
          inputMode="decimal"
          placeholder="1250,00"
          className={`mt-1 ${fieldClass}`}
        />
      </div>

      <div className="sm:col-span-3">
        <label className={labelClass} htmlFor="note">
          Omschrijving
        </label>
        <input
          id="note"
          name="note"
          placeholder="Bijvoorbeeld: resultaatkosten campagne 3 t/m 21 augustus"
          className={`mt-1 ${fieldClass}`}
        />
      </div>

      <div className="flex items-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>

      {error && (
        <p className="sm:col-span-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
          {error}
        </p>
      )}
    </form>
  )
}

const labelClass = 'block text-[10px] font-semibold uppercase tracking-wide text-gray-500'
const fieldClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition-colors focus:border-indigo-400'
