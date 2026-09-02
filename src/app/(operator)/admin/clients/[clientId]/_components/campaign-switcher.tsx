'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { setCampaignTracksAction } from '../campagne-actions'

interface Props {
  clientId: string
  trackCount: number
  name1: string | null
  name2: string | null
}

/**
 * Rechtsboven op elke klantpagina: draait deze klant één of twee campagnes, en
 * bij twee — welke kijk je nu.
 *
 * De actieve campagne staat in de URL (?campagne=2). Daardoor blijft hij staan
 * als je ververst, kun je een link naar de juiste campagne sturen, en weet elke
 * pagina waar hij naar moet kijken zonder verborgen state.
 *
 * Bij één campagne is er niets te wisselen en staat er alleen de keuze 1 of 2.
 */
export function CampaignSwitcher({ clientId, trackCount, name1, name2 }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [renaming, setRenaming] = useState(false)
  const [draft1, setDraft1] = useState(name1 ?? '')
  const [draft2, setDraft2] = useState(name2 ?? '')
  const [error, setError] = useState<string | null>(null)

  const active = searchParams.get('campagne') === '2' ? 2 : 1

  function goToTrack(track: 1 | 2) {
    const params = new URLSearchParams(searchParams.toString())
    if (track === 1) params.delete('campagne')
    else params.set('campagne', '2')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  function setCount(count: 1 | 2) {
    if (count === trackCount) return
    setError(null)
    startTransition(async () => {
      const result = await setCampaignTracksAction(clientId, count, draft1 || null, draft2 || null)
      if (result.error) {
        setError(result.error)
        return
      }
      // Terug naar één campagne terwijl je op campagne 2 staat zou een lege
      // pagina opleveren; daarom eerst terug naar de eerste.
      if (count === 1 && active === 2) goToTrack(1)
      router.refresh()
    })
  }

  function saveNames() {
    setError(null)
    startTransition(async () => {
      const result = await setCampaignTracksAction(
        clientId,
        trackCount === 2 ? 2 : 1,
        draft1 || null,
        draft2 || null
      )
      if (result.error) {
        setError(result.error)
        return
      }
      setRenaming(false)
      router.refresh()
    })
  }

  const label1 = name1?.trim() || 'Campagne 1'
  const label2 = name2?.trim() || 'Campagne 2'

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700">
          {error}
        </span>
      )}

      {renaming ? (
        <div className="flex items-center gap-1.5">
          <input
            value={draft1}
            onChange={(e) => setDraft1(e.target.value)}
            placeholder="Campagne 1"
            className="w-32 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {trackCount === 2 && (
            <input
              value={draft2}
              onChange={(e) => setDraft2(e.target.value)}
              placeholder="Campagne 2"
              className="w-32 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          )}
          <button
            type="button"
            onClick={saveNames}
            disabled={pending}
            className="rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? '…' : 'Opslaan'}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft1(name1 ?? '')
              setDraft2(name2 ?? '')
              setRenaming(false)
            }}
            className="text-[11px] font-semibold text-gray-400 hover:text-gray-900"
          >
            Annuleren
          </button>
        </div>
      ) : (
        <>
          {/* De toggle zelf: alleen zichtbaar zodra er iets te wisselen valt. */}
          {trackCount === 2 && (
            <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
              {([1, 2] as const).map((track) => (
                <button
                  key={track}
                  type="button"
                  onClick={() => goToTrack(track)}
                  aria-pressed={active === track}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active === track
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {track === 1 ? label1 : label2}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setRenaming(true)}
            title="Campagnenamen wijzigen"
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Namen
          </button>

          {/* Eén of twee campagnes. Eén is de standaard en geldt voor bijna
              iedereen; twee is de uitzondering. */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Campagnes
            </span>
            <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
              {([1, 2] as const).map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setCount(count)}
                  disabled={pending}
                  aria-pressed={trackCount === count}
                  className={`h-6 w-6 rounded-full text-xs font-semibold transition-all disabled:opacity-50 ${
                    trackCount === count
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
