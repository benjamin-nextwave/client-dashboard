'use client'

import { useEffect, useMemo, useState } from 'react'
import type { KixTask } from '@/lib/data/loopgang-kix-tasks'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { buildTasks, describeTiming, type LoopgangTask } from '@/lib/loopgang/tasks'
import { formatDayShort } from './dialogs'
import { TaskDialog } from './task-dialog'

/**
 * Wat er vandaag moet gebeuren, altijd in beeld.
 *
 * De takenlijst zat achter een knop en achter een tabblad, en daarmee zag je hem
 * alleen als je eraan dacht. Dit venster zweeft rechtsonder over de pagina heen,
 * op elk tabblad, en toont hetzelfde: alles wat vandaag valt plus alles wat al
 * te laat is. Niets meer — wat volgende week aankomt hoort hier niet, dat maakt
 * het venster alleen langer zonder dat je er iets mee kunt.
 *
 * Ingeklapt blijft de teller staan, want een venster dat je wegklikt en dan
 * vergeet is geen venster maar een onderbreking. De keuze wordt onthouden in de
 * browser zodat hij niet bij elke verversing terugspringt.
 */

const OPSLAG_SLEUTEL = 'loopgang-taken-venster'

export function FloatingTasks({
  clients,
  kixTasks,
  today,
}: {
  clients: LoopgangOverviewClient[]
  kixTasks: KixTask[]
  today: string
}) {
  const [open, setOpen] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Pas na het laden uit de browser lezen: op de server bestaat localStorage
  // niet, en een afwijkende eerste opmaak geeft een hydratiefout.
  useEffect(() => {
    try {
      const bewaard = window.localStorage.getItem(OPSLAG_SLEUTEL)
      if (bewaard === 'dicht') setOpen(false)
    } catch {
      // Een browser die opslag blokkeert hoort het venster gewoon te tonen.
    }
  }, [])

  function toggle() {
    setOpen((v) => {
      try {
        window.localStorage.setItem(OPSLAG_SLEUTEL, v ? 'dicht' : 'open')
      } catch {
        // Niet kunnen onthouden is geen reden om niet te kunnen klappen.
      }
      return !v
    })
  }

  // Alleen vandaag en te laat: horizon nul.
  const tasks = useMemo(() => buildTasks(clients, today), [clients, today])

  const teLaat = tasks.filter((t) => t.status === 'overdue')
  const vandaag = tasks.filter((t) => t.status === 'due')

  // Wat er al naar Kix ging, opzoekbaar per klant en soort.
  const verstuurd = useMemo(() => {
    const map = new Map<string, KixTask>()
    for (const task of kixTasks) {
      if (task.status !== 'open') continue
      map.set(`${task.clientId}|${task.kind}`, task)
    }
    return map
  }, [kixTasks])

  if (tasks.length === 0 && !open) return null

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors ${
              teLaat.length > 0 ? 'bg-rose-600 text-white' : 'bg-gray-900 text-white'
            }`}
          >
            <span className="text-xs font-semibold">
              Vandaag te doen
              <span className="ml-1.5 rounded bg-white/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                {tasks.length}
              </span>
              {teLaat.length > 0 && (
                <span className="ml-1 text-[10px] font-normal opacity-90">
                  waarvan {teLaat.length} te laat
                </span>
              )}
            </span>

            <svg
              className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 15-7.5-7.5L4.5 15" />
            </svg>
          </button>

          {open && (
            <>
              {tasks.length === 0 ? (
                <p className="px-4 py-4 text-center text-[11px] text-gray-500">
                  Er staat vandaag niets open en er is niets te laat.
                </p>
              ) : (
                <div className="max-h-[24rem] overflow-y-auto">
                  <Groep
                    titel="Te laat"
                    tasks={teLaat}
                    verstuurd={verstuurd}
                    kleur="text-rose-600"
                  />
                  <Groep
                    titel="Vandaag"
                    tasks={vandaag}
                    verstuurd={verstuurd}
                    kleur="text-amber-600"
                  />
                </div>
              )}

              {tasks.length > 0 && (
                <div className="border-t border-gray-100 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="w-full rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
                  >
                    Naar Kix sturen
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {dialogOpen && (
        <TaskDialog tasks={tasks} today={today} onClose={() => setDialogOpen(false)} />
      )}
    </>
  )
}

function Groep({
  titel,
  tasks,
  verstuurd,
  kleur,
}: {
  titel: string
  tasks: LoopgangTask[]
  verstuurd: Map<string, KixTask>
  kleur: string
}) {
  if (tasks.length === 0) return null

  return (
    <section>
      <h3 className="sticky top-0 border-b border-gray-100 bg-gray-50/95 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        {titel}
        <span className="ml-1 tabular-nums">{tasks.length}</span>
      </h3>

      <ul className="divide-y divide-gray-50">
        {tasks.map((task) => {
          const eerder = verstuurd.get(`${task.clientId}|${task.kind}`)
          return (
            <li key={`${task.clientId}-${task.kind}`} className="px-4 py-2">
              <div className="text-[11px] leading-snug">
                <span className="font-semibold text-gray-900">{task.clientName}</span>
                <span className="text-gray-800"> — {task.label}</span>
                <span className={`ml-1 font-medium ${kleur}`}>({describeTiming(task)})</span>
              </div>
              <div className="mt-0.5 text-[10px] font-medium">
                {eerder ? (
                  <span className="text-indigo-600">
                    {eerder.reminderCount}× naar Kix · laatst{' '}
                    {formatDayShort(eerder.lastSentAt.slice(0, 10))}
                  </span>
                ) : (
                  <span className="text-gray-300">nog niet naar Kix</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
