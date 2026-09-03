'use client'

import type { KixTask } from '@/lib/data/loopgang-kix-tasks'
import { formatDayShort } from './dialogs'

/**
 * Wat er naar Kix is gestuurd, naast de kalender.
 *
 * Dit paneel staat er standaard, ook zonder gekozen klant — het is precies wat
 * je wil weten voordat je iemand voor de derde dag op rij aan dezelfde factuur
 * herinnert. Kies je één klant, dan blijft alleen zijn geschiedenis over,
 * inclusief de afgeronde taken.
 */

/** Hoeveel regels er zonder klantkeuze in het paneel passen. */
const MAX_ZONDER_KEUZE = 8

export function KixHistory({
  tasks,
  clientId,
  clientName,
}: {
  tasks: KixTask[]
  /** De gekozen klant, of null als er niemand gekozen is. */
  clientId: string | null
  clientName: string | null
}) {
  const relevant = clientId
    ? tasks.filter((t) => t.clientId === clientId)
    : tasks.filter((t) => t.status === 'open').slice(0, MAX_ZONDER_KEUZE)

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Naar Kix gestuurd
        </h2>
        <span className="text-[10px] text-gray-400">
          {clientName ?? 'alle openstaande'}
        </span>
      </div>

      {relevant.length === 0 ? (
        <p className="px-4 py-3 text-[11px] leading-snug text-gray-400">
          {clientId
            ? 'Deze klant heeft nog geen taken gehad.'
            : 'Er staat niets open bij Kix.'}
        </p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {relevant.map((task) => (
            <li key={task.id} className="px-4 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {!clientId && (
                    <div className="truncate text-[11px] font-semibold text-gray-900">
                      {task.clientName}
                    </div>
                  )}
                  <div className="text-[11px] leading-snug text-gray-700">{task.label}</div>
                  {task.kixNote && (
                    <div className="mt-0.5 text-[10px] leading-snug text-gray-500">
                      “{task.kixNote}”
                    </div>
                  )}
                </div>

                <div className="shrink-0 text-right">
                  <div
                    className={`text-[10px] font-semibold tabular-nums ${
                      task.status === 'done' ? 'text-gray-300' : 'text-indigo-600'
                    }`}
                  >
                    {task.reminderCount}×
                  </div>
                  <div className="text-[10px] tabular-nums text-gray-400">
                    {formatDayShort(task.lastSentAt.slice(0, 10))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
