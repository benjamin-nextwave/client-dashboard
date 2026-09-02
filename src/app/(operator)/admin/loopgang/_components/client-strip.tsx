'use client'

import { useState } from 'react'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import {
  ClientActions,
  ClientDialogs,
  CycleSummary,
  type DialogState,
  type OpenDialog,
} from './client-actions'

interface Props {
  /** De dag die in de kalender geselecteerd staat. */
  date: string
  today: string
  clients: LoopgangOverviewClient[]
  /** De enige gekozen campagne; alleen daar kan er iets vastgelegd worden. */
  activeClientKey: string | null
  onSelectClient: (clientKey: string) => void
}

/**
 * Alle klanten naast elkaar onder de kalender. Staat er altijd, ook op een dag
 * waarop niets speelt: anders is er op een lege dag geen weg naar de knoppen.
 *
 * Openklappen gebeurt in het vakje zelf. Het raster staat op `items-start`, dus
 * de andere vakjes in dezelfde rij groeien niet mee.
 */
export function ClientStrip({
  date,
  today,
  clients,
  activeClientKey,
  onSelectClient,
}: Props) {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const isFuture = date > today

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          Klanten
          {!isFuture && <span className="font-normal normal-case"> — verzonden op deze dag</span>}
        </h3>
        <p className="text-[10px] text-gray-400">
          Klik een klant open voor de cyclusstand en de knoppen.
        </p>
      </div>

      {clients.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">Geen klanten die aan dit filter voldoen.</p>
      ) : (
        <div className="mt-3 grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {clients.map((client) => {
            const sent = client.sentByDate[date] ?? 0
            const pct = Math.min(100, Math.round((sent / client.dailySendTarget) * 100))
            const paused = client.pausedDates.includes(date)
            const open = expanded === client.key

            return (
              <div
                key={client.key}
                className={`rounded-xl border p-3 transition-colors ${
                  open ? 'border-gray-300 bg-gray-50' : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : client.key)}
                  className="w-full text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold text-gray-900">
                      {client.displayName}
                    </span>
                    {client.cycle.anchor && (
                      <span className="shrink-0 text-[10px] tabular-nums text-gray-400">
                        wd {client.cycle.workday}
                      </span>
                    )}
                  </div>

                  {isFuture ? (
                    <div className="mt-1 text-[10px] text-gray-400">
                      {open ? 'klik om te sluiten' : 'klik voor de knoppen'}
                    </div>
                  ) : (
                    <>
                      <div className="mt-1 text-[11px] tabular-nums text-gray-600">
                        {sent.toLocaleString('nl-NL')}
                        <span className="text-gray-300">
                          {' '}
                          / {client.dailySendTarget.toLocaleString('nl-NL')}
                        </span>
                        {paused && sent === 0 && (
                          <span className="ml-1.5 text-amber-600">gepauzeerd</span>
                        )}
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${
                            sent === 0
                              ? paused
                                ? 'bg-amber-300'
                                : 'bg-gray-200'
                              : pct >= 70
                                ? 'bg-emerald-500'
                                : 'bg-amber-400'
                          }`}
                          style={{ width: `${sent === 0 && paused ? 100 : pct}%` }}
                        />
                      </div>
                    </>
                  )}
                </button>

                {open && (
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <CycleSummary client={client} />

                    {/* Vastleggen kan alleen bij de klant die als enige gekozen
                        is. Staat de kalender op iedereen, dan is dit een
                        overzicht en geen invoerscherm. */}
                    {activeClientKey === client.key ? (
                      <ClientActions
                        client={client}
                        today={today}
                        onOpen={(kind: OpenDialog) => setDialog({ clientKey: client.key, kind })}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectClient(client.key)}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-gray-800"
                      >
                        Alleen deze campagne tonen om te bewerken
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ClientDialogs
        state={dialog}
        clients={clients}
        today={today}
        date={date}
        onClose={() => setDialog(null)}
      />
    </section>
  )
}
