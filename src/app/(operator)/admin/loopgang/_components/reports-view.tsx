'use client'

import { useMemo, useState } from 'react'
import type { MeetingReport } from '@/lib/data/loopgang-meeting-reports'
import { REPORT_LABELS } from '@/lib/data/loopgang-meeting-reports'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { ReportSlots } from './meeting-reports'
import { formatDayShort } from './dialogs'

/**
 * Alle rapporten, per klant en per periode.
 *
 * Naast de kalender staan ze alleen op de dag van een meeting, en dan alleen van
 * de klant die je toevallig had aangeklikt. Dit tabblad is het overzicht: welke
 * klant heeft zijn drie stukken compleet, en waar ontbreekt er nog iets.
 *
 * Uploaden hoeft hier niet aan een meeting te hangen. De rapporten zijn altijd
 * al aan de periode opgehangen en niet aan de meetingdatum, dus een klant zonder
 * geplande meeting kan ze gewoon krijgen — de meeting staat er als context bij
 * als hij er is.
 *
 * Klanten zonder cyclusstart hebben geen periode om iets aan te hangen. Die
 * staan onderaan met de reden erbij in plaats van dat ze stilzwijgend ontbreken.
 */

type Filter = 'onvolledig' | 'compleet' | 'alles'

const FILTER_LABELS: Record<Filter, string> = {
  onvolledig: 'Nog niet compleet',
  compleet: 'Compleet',
  alles: 'Alle klanten',
}

/** Hoeveel stukken er per periode horen te liggen. */
const AANTAL_SOORTEN = 3

export function ReportsView({
  clients,
  reports,
}: {
  clients: LoopgangOverviewClient[]
  reports: MeetingReport[]
}) {
  const [filter, setFilter] = useState<Filter>('onvolledig')

  const perKlant = useMemo(() => {
    const map = new Map<string, MeetingReport[]>()
    for (const report of reports) {
      const lijst = map.get(report.clientId)
      if (lijst) lijst.push(report)
      else map.set(report.clientId, [report])
    }
    return map
  }, [reports])

  const metPeriode = clients.filter((c) => c.cycle.anchor !== null)
  const zonderPeriode = clients.filter((c) => c.cycle.anchor === null)

  const rijen = metPeriode.map((client) => {
    const alles = perKlant.get(client.id) ?? []
    const huidig = alles.filter((r) => r.cycleAnchor === client.cycle.anchor)
    const eerder = alles.filter((r) => r.cycleAnchor !== client.cycle.anchor)
    return { client, huidig, eerder, compleet: huidig.length === AANTAL_SOORTEN }
  })

  const zichtbaar = rijen.filter((rij) =>
    filter === 'alles' ? true : filter === 'compleet' ? rij.compleet : !rij.compleet
  )

  const compleetAantal = rijen.filter((r) => r.compleet).length

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Rapporten</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {compleetAantal} van {rijen.length} klanten heeft alle drie de stukken van de lopende
            periode · maandrapport, leadrapport en intern rapport
          </p>
        </div>

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
      </header>

      {zichtbaar.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
          {filter === 'onvolledig'
            ? 'Alle klanten met een lopende periode hebben hun stukken compleet.'
            : 'Niets in dit filter.'}
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {zichtbaar.map(({ client, huidig, eerder, compleet }) => (
            <article
              key={client.key}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: client.primaryColor }}
                    />
                    <h3 className="truncate text-xs font-semibold text-gray-900">
                      {client.displayName}
                    </h3>
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    periode vanaf {formatDayShort(client.cycle.anchor as string)}
                    {client.cycle.invoiceDueDate &&
                      ` t/m ${formatDayShort(client.cycle.invoiceDueDate)}`}
                    {' · '}
                    {client.meeting?.outcome === 'planned' && client.meeting.meetingDate
                      ? `meeting ${formatDayShort(client.meeting.meetingDate)}`
                      : client.meeting?.outcome === 'stop'
                        ? 'klant stopt'
                        : client.meeting?.outcome === 'continue'
                          ? 'geen meeting, gaat door'
                          : 'nog geen meeting gepland'}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    compleet ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {huidig.length}/{AANTAL_SOORTEN}
                </span>
              </div>

              <ReportSlots
                clientId={client.id}
                anchor={client.cycle.anchor as string}
                reports={huidig}
                kixMode={false}
              />

              {eerder.length > 0 && <Eerder reports={eerder} />}
            </article>
          ))}
        </div>
      )}

      {zonderPeriode.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Geen lopende periode · {zonderPeriode.length}
          </h3>
          <p className="mt-1 text-[11px] leading-snug text-gray-500">
            Rapporten hangen aan een periode. Zet eerst de cyclusstart bij:{' '}
            {zonderPeriode.map((c) => c.displayName).join(', ')}.
          </p>
        </section>
      )}
    </div>
  )
}

/** De stukken van eerdere periodes, ingeklapt: ze zijn zelden nodig maar wel eens. */
function Eerder({ reports }: { reports: MeetingReport[] }) {
  const perPeriode = new Map<string, MeetingReport[]>()
  for (const report of reports) {
    const lijst = perPeriode.get(report.cycleAnchor)
    if (lijst) lijst.push(report)
    else perPeriode.set(report.cycleAnchor, [report])
  }

  const periodes = [...perPeriode.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <details className="border-t border-gray-100 px-4 py-2">
      <summary className="cursor-pointer text-[10px] font-semibold text-gray-400 transition-colors hover:text-gray-900">
        Eerdere periodes ({periodes.length})
      </summary>

      <ul className="mt-1.5 space-y-1.5">
        {periodes.map(([anchor, lijst]) => (
          <li key={anchor} className="text-[10px]">
            <span className="font-semibold tabular-nums text-gray-600">
              vanaf {formatDayShort(anchor)}
            </span>
            <span className="ml-1.5 space-x-1.5">
              {lijst.map((r) => (
                <a
                  key={r.id}
                  href={r.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline-offset-2 hover:underline"
                >
                  {REPORT_LABELS[r.kind]}
                </a>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
