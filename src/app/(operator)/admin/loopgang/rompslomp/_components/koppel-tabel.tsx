'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { RompslompContact } from '@/lib/rompslomp/sales-invoices'
import { suggestMatch } from '@/lib/rompslomp/matching'
import { koppelContactAction, syncInvoicesAction, type SyncResult } from '../actions'

/**
 * Elk factuurcontact naast de klant waar het bij hoort.
 *
 * De suggestie staat er alleen als hint bij; kiezen doe je zelf. Automatisch
 * koppelen op naam zou hier misgaan: de helft van de contacten factureert onder
 * een statutaire naam, en er staan contacten tussen die helemaal geen klant in
 * de loopgang zijn.
 */

interface Client {
  id: string
  name: string
  contactId: number | null
  inLoopgang: boolean
}

type Filter = 'open' | 'gekoppeld' | 'alles'

const FILTER_LABELS: Record<Filter, string> = {
  open: 'Nog te koppelen',
  gekoppeld: 'Gekoppeld',
  alles: 'Alles',
}

export function KoppelTabel({
  clients,
  contacts,
  invoiceCount,
}: {
  clients: Client[]
  contacts: RompslompContact[]
  invoiceCount: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<Filter>('open')
  const [error, setError] = useState<string | null>(null)
  const [sync, setSync] = useState<SyncResult | null>(null)

  // Welke klant er aan een contact hangt, opzoekbaar vanuit het contact.
  const clientByContact = useMemo(() => {
    const map = new Map<number, Client>()
    for (const client of clients) {
      if (client.contactId !== null) map.set(client.contactId, client)
    }
    return map
  }, [clients])

  const gekoppeld = clientByContact.size

  const rijen = useMemo(() => {
    const bezet = new Set(clients.filter((c) => c.contactId !== null).map((c) => c.id))

    return contacts.map((contact) => {
      const client = clientByContact.get(contact.id) ?? null
      const suggestie = client
        ? null
        : suggestMatch(
            contact.name,
            clients.filter((c) => c.inLoopgang).map((c) => ({ id: c.id, name: c.name })),
            bezet
          )
      return { contact, client, suggestie }
    })
  }, [contacts, clients, clientByContact])

  const zichtbaar = rijen.filter((rij) =>
    filter === 'alles' ? true : filter === 'gekoppeld' ? rij.client !== null : rij.client === null
  )

  function koppel(clientId: string, contactId: number | null) {
    setError(null)
    startTransition(async () => {
      const result = await koppelContactAction(clientId, contactId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function overnemen() {
    setError(null)
    setSync(null)
    startTransition(async () => {
      const result = await syncInvoicesAction()
      if (result.error) {
        setError(result.error)
        return
      }
      setSync(result)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-xs text-gray-600">
          <span className="font-semibold tabular-nums text-gray-900">{gekoppeld}</span> van{' '}
          <span className="tabular-nums">{contacts.length}</span> contacten gekoppeld ·{' '}
          <span className="tabular-nums">{invoiceCount}</span> facturen in Rompslomp
        </div>

        <button
          type="button"
          onClick={overnemen}
          disabled={pending || gekoppeld === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
        >
          {pending ? 'Bezig…' : 'Facturen overnemen'}
        </button>
      </section>

      {sync && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          Overgenomen voor {sync.clients} {sync.clients === 1 ? 'klant' : 'klanten'}:{' '}
          {sync.created} nieuw, {sync.updated} bijgewerkt. De betaaldatum is een schatting —
          Rompslomp geeft wel of een factuur betaald is, niet wanneer.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          {error}
        </p>
      )}

      <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {FILTER_LABELS[key]}
          </button>
        ))}
      </div>

      {zichtbaar.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
          {filter === 'open' ? 'Alle contacten zijn gekoppeld.' : 'Niets in dit filter.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Contact in Rompslomp</th>
                <th className="px-4 py-2">Facturen</th>
                <th className="px-4 py-2">Klant in het dashboard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {zichtbaar.map(({ contact, client, suggestie }) => (
                <tr key={contact.id} className="align-middle">
                  <td className="px-4 py-2.5">
                    <div className="text-xs font-semibold text-gray-900">{contact.name}</div>
                    <div className="text-[10px] tabular-nums text-gray-400">
                      contact {contact.id}
                    </div>
                  </td>

                  <td className="px-4 py-2.5 text-[11px] tabular-nums text-gray-500">
                    {contact.invoiceCount}× · laatst {contact.lastInvoiceDate}
                  </td>

                  <td className="px-4 py-2.5">
                    <select
                      value={client?.id ?? ''}
                      disabled={pending}
                      onChange={(e) => {
                        const nieuw = e.target.value
                        // Eerst de oude koppeling los, anders botst de unieke index.
                        if (client && client.id !== nieuw) koppel(client.id, null)
                        if (nieuw !== '') koppel(nieuw, contact.id)
                      }}
                      className={`w-full max-w-xs rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-indigo-400 ${
                        client
                          ? 'border-gray-900 text-gray-900'
                          : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <option value="">— niet koppelen —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.inLoopgang ? '' : ' (niet in loopgang)'}
                          {c.contactId !== null && c.contactId !== contact.id ? ' · al gekoppeld' : ''}
                        </option>
                      ))}
                    </select>

                    {suggestie && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => koppel(suggestie.candidate.id, contact.id)}
                        className="mt-1 text-[10px] font-semibold text-indigo-600 transition-colors hover:text-indigo-800 disabled:opacity-40"
                      >
                        voorstel: {suggestie.candidate.name} — koppelen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
