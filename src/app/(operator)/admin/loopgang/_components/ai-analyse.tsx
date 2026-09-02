'use client'

import { useState, useTransition } from 'react'
import type { AnalyseKlant, Categorie, LoopgangAnalyse } from '@/lib/loopgang/analyse'
import { analyseerLoopgangAction } from '../actions'

/**
 * De samenvatting onder de kalender. Draait op een knop en niet automatisch:
 * elke analyse kost een modelaanroep, en de kalender erboven staat er al.
 *
 * De uitkomst veroudert zodra er iets wordt vastgelegd. Daarom staat het tijdstip
 * erbij en blijft de knop staan om opnieuw te draaien.
 */

interface BakStijl {
  titel: string
  uitleg: string
  rand: string
  kop: string
  stip: string
}

const BAKKEN: Record<Categorie, BakStijl> = {
  spoed: {
    titel: 'Spoed',
    uitleg: 'Loopt uit de hand — gepauzeerde campagne of een gemiste deadline',
    rand: 'border-rose-200 bg-rose-50/60',
    kop: 'text-rose-900',
    stip: 'bg-rose-500',
  },
  actie: {
    titel: 'Actie ondernemen',
    uitleg: 'Op schema, maar vandaag of morgen iets te doen',
    rand: 'border-amber-200 bg-amber-50/60',
    kop: 'text-amber-900',
    stip: 'bg-amber-500',
  },
  opletten: {
    titel: 'Op letten',
    uitleg: 'Binnen enkele dagen komt er iets aan',
    rand: 'border-sky-200 bg-sky-50/60',
    kop: 'text-sky-900',
    stip: 'bg-sky-500',
  },
  goed: {
    titel: 'Goed',
    uitleg: 'Alles geregeld, er hoeft niets',
    rand: 'border-emerald-200 bg-emerald-50/60',
    kop: 'text-emerald-900',
    stip: 'bg-emerald-500',
  },
}

const VOLGORDE: Categorie[] = ['spoed', 'actie', 'opletten', 'goed']

function tijdstip(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(d)
}

export function AiAnalyse({ month }: { month: string }) {
  const [pending, startTransition] = useTransition()
  const [analyse, setAnalyse] = useState<LoopgangAnalyse | null>(null)
  const [error, setError] = useState<string | null>(null)

  function draai() {
    setError(null)
    startTransition(async () => {
      const result = await analyseerLoopgangAction(month)
      if (result.error) {
        setError(result.error)
        return
      }
      setAnalyse(result.analyse ?? null)
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Analyse</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {analyse
              ? `Gemaakt om ${tijdstip(analyse.gemaaktOp)}. Leg je hierna iets vast, draai hem dan opnieuw.`
              : 'Deelt alle klanten in vier bakken in en zegt per klant wat er moet gebeuren.'}
          </p>
        </div>
        <button
          type="button"
          onClick={draai}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Bezig…' : analyse ? 'Opnieuw analyseren' : 'Analyseer de loopgang'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
          {error}
        </p>
      )}

      {analyse && (
        <div className="mt-4 space-y-4">
          <p className="text-xs font-medium text-gray-900">{analyse.koptekst}</p>

          <div className="grid gap-3 lg:grid-cols-2">
            {VOLGORDE.map((cat) => {
              const stijl = BAKKEN[cat]
              const rijen = analyse.klanten
                .filter((k) => k.categorie === cat)
                .sort((a, b) => b.ernst - a.ernst || a.naam.localeCompare(b.naam))

              return (
                <div key={cat} className={`rounded-xl border p-3.5 ${stijl.rand}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className={`text-xs font-semibold uppercase tracking-wide ${stijl.kop}`}>
                      {stijl.titel}
                    </h3>
                    <span className="text-[11px] tabular-nums text-gray-500">
                      {rijen.length} {rijen.length === 1 ? 'klant' : 'klanten'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-500">{stijl.uitleg}</p>

                  {rijen.length === 0 ? (
                    <p className="mt-2.5 text-[11px] text-gray-400">Niemand.</p>
                  ) : (
                    <ul className="mt-2.5 space-y-2">
                      {rijen.map((k) => (
                        <KlantRegel key={k.naam} klant={k} stip={stijl.stip} />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[10px] text-gray-400">
            Geschreven door een taalmodel op basis van de cijfers uit deze pagina. De datums en
            bedragen komen uit de database; de indeling en de zinnen zijn een inschatting.
          </p>
        </div>
      )}
    </section>
  )
}

function KlantRegel({ klant, stip }: { klant: AnalyseKlant; stip: string }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1 flex shrink-0 gap-0.5" aria-hidden>
        {/* Bij spoed maken drie stipjes het verschil zichtbaar zonder een tweede kleurcodering. */}
        {Array.from({ length: klant.categorie === 'spoed' ? klant.ernst : 1 }).map((_, i) => (
          <span key={i} className={`h-1.5 w-1.5 rounded-full ${stip}`} />
        ))}
      </span>
      <span className="min-w-0 text-[11px] leading-relaxed text-gray-700">
        <span className="font-semibold text-gray-900">{klant.naam}</span>
        {klant.categorie === 'spoed' && (
          <span className="sr-only">{` — ernst ${klant.ernst} van 3`}</span>
        )}
        {' — '}
        {klant.regel}
      </span>
    </li>
  )
}
