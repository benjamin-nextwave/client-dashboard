'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { listSyncTargetsAction, syncInstantlyBatchAction } from '../sync-actions'

/**
 * Haalt de Instantly-cijfers op.
 *
 * In brokjes van vier klanten, niet alles in één keer. De vorige opzet deed alle
 * klanten binnen één verzoek en liep daarmee tegen de tijdgrens van een
 * serverless-functie; wat er niet af kwam viel stil terug op nul, en dan leek
 * een draaiende klant stil te staan.
 *
 * De voortgang staat op de knop. Gaat er onderweg iets mis bij een klant, dan
 * blijft dat staan nadat het klaar is — een cijfer dat er niet is hoor je te
 * zien, niet te moeten raden.
 */
export function SyncButton({ activeClientId }: { activeClientId: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<{ gedaan: number; totaal: number } | null>(null)
  const [problemen, setProblemen] = useState<string[]>([])

  function run(alleen: string | null) {
    setProblemen([])
    startTransition(async () => {
      const targets = alleen
        ? [{ id: alleen, name: '' }]
        : await listSyncTargetsAction()

      setProgress({ gedaan: 0, totaal: targets.length })
      const fouten: string[] = []

      for (let i = 0; i < targets.length; i += 4) {
        const batch = targets.slice(i, i + 4)
        const result = await syncInstantlyBatchAction(batch.map((t) => t.id))

        if (result.error) {
          fouten.push(result.error)
          break
        }
        for (const klant of result.done ?? []) {
          if (klant.error) fouten.push(`${klant.name}: ${klant.error}`)
        }
        setProgress({ gedaan: Math.min(i + 4, targets.length), totaal: targets.length })
      }

      setProblemen(fouten)
      setProgress(null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {activeClientId && (
          <button
            type="button"
            onClick={() => run(activeClientId)}
            disabled={pending}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Alleen deze klant
          </button>
        )}
        <button
          type="button"
          onClick={() => run(null)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <svg
            className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992V4.356m-4.992 4.992a8.25 8.25 0 0 0-13.803-3.7L3 7.5m13.023 1.848L21 4.5M2.985 14.652H7.977v4.992m-4.992-4.992a8.25 8.25 0 0 0 13.803 3.7L21 16.5"
            />
          </svg>
          {progress
            ? `Ophalen ${progress.gedaan}/${progress.totaal}…`
            : pending
              ? 'Ophalen…'
              : 'Ververs cijfers'}
        </button>
      </div>

      {problemen.length > 0 && (
        <details className="max-w-xs text-right">
          <summary className="cursor-pointer text-[10px] font-semibold text-amber-600">
            {problemen.length} {problemen.length === 1 ? 'klant' : 'klanten'} met een probleem
          </summary>
          <ul className="mt-1 space-y-0.5 text-left text-[10px] leading-snug text-gray-500">
            {problemen.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
