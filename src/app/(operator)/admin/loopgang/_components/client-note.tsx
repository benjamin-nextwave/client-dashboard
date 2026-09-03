'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { setClientNoteAction } from '../actions'

/**
 * De vrije aantekening bij een klant, altijd in beeld zodra je op die klant
 * hebt geklikt.
 *
 * Staat er iets, dan lees je het meteen — daarvoor is het bedoeld. Bewerken
 * gebeurt in hetzelfde kaartje: een dialoog zou betekenen dat je hem eerst moet
 * openen om te zien wat erin staat, en dan wordt hij niet gelezen.
 */
export function ClientNote({ client }: { client: LoopgangOverviewClient }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [bewerken, setBewerken] = useState(false)
  const [tekst, setTekst] = useState(client.operatorNote ?? '')
  const [error, setError] = useState<string | null>(null)

  // Bij het wisselen van klant hoort het veld de notitie van die klant te tonen,
  // niet die van de vorige.
  useEffect(() => {
    setTekst(client.operatorNote ?? '')
    setBewerken(false)
    setError(null)
  }, [client.key, client.operatorNote])

  function opslaan() {
    setError(null)
    startTransition(async () => {
      const result = await setClientNoteAction(client.id, tekst)
      if (result.error) {
        setError(result.error)
        return
      }
      setBewerken(false)
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Notitie — {client.displayName}
        </h3>
        {!bewerken && (
          <button
            type="button"
            onClick={() => setBewerken(true)}
            className="text-[11px] font-semibold text-gray-500 hover:text-gray-900"
          >
            {client.operatorNote ? 'aanpassen' : 'toevoegen'}
          </button>
        )}
      </div>

      {bewerken ? (
        <div className="mt-2 space-y-2">
          <textarea
            rows={4}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            placeholder="Bijvoorbeeld: factuur via crediteuren@, belt liever 's ochtends, geen mails naar de holding."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-400"
          />
          {error && <p className="text-[11px] font-medium text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setTekst(client.operatorNote ?? '')
                setBewerken(false)
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={opslaan}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
      ) : client.operatorNote ? (
        <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-gray-800">
          {client.operatorNote}
        </p>
      ) : (
        <p className="mt-1.5 text-[11px] text-gray-400">Nog geen notitie.</p>
      )}
    </section>
  )
}
