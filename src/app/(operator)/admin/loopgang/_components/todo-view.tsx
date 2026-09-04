'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { storageKindFor, type KixTask } from '@/lib/data/loopgang-kix-tasks'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import {
  buildTasks,
  describeTiming,
  formatTasksText,
  urgencyOf,
  type LoopgangTask,
  type TaskUrgency,
} from '@/lib/loopgang/tasks'
import { sendTasksToWebhookAction } from '../actions'
import { formatDayShort } from './dialogs'

/**
 * Alles wat er nog moet gebeuren, op urgentie gestapeld.
 *
 * De kalender laat zien wanneer iets valt; deze lijst laat zien wat er blijft
 * liggen. Een meetingvenster dat drie weken geleden openging staat in de
 * kalender ergens links buiten beeld, maar hoort hier bovenaan.
 *
 * Bij elke taak staat hoe vaak Kix er al aan herinnerd is en wanneer voor het
 * laatst. Zonder dat ging dezelfde openstaande factuur drie dagen op rij de deur
 * uit, want het overzicht toont hem elke dag opnieuw.
 */

/** Hoeveel dagen vooruit "komt eraan" kijkt. */
const HORIZON_DAYS = 7

interface Groep {
  key: TaskUrgency
  titel: string
  uitleg: string
  rand: string
  kop: string
}

const GROEPEN: Groep[] = [
  {
    key: 'overdue',
    titel: 'Te laat',
    uitleg: 'Had al moeten gebeuren',
    rand: 'border-rose-200 bg-rose-50/50',
    kop: 'text-rose-900',
  },
  {
    key: 'today',
    titel: 'Vandaag',
    uitleg: 'Valt op de dag van vandaag',
    rand: 'border-amber-200 bg-amber-50/50',
    kop: 'text-amber-900',
  },
  {
    key: 'soon',
    titel: `Komt eraan`,
    uitleg: `Binnen ${HORIZON_DAYS} dagen`,
    rand: 'border-sky-200 bg-sky-50/50',
    kop: 'text-sky-900',
  },
]

interface Props {
  clients: LoopgangOverviewClient[]
  kixTasks: KixTask[]
  today: string
}

export function TodoView({ clients, kixTasks, today }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<number | null>(null)

  const tasks = useMemo(
    () => buildTasks(clients, today, HORIZON_DAYS),
    [clients, today]
  )

  // Wat er al naar Kix ging, opzoekbaar per klant en soort. Alleen openstaande
  // taken tellen: een afgeronde taak van vorige maand zegt niets over deze.
  const verstuurd = useMemo(() => {
    const map = new Map<string, KixTask>()
    for (const task of kixTasks) {
      if (task.status !== 'open') continue
      map.set(`${task.clientId}|${task.kind}`, task)
    }
    return map
  }, [kixTasks])

  const selected = tasks.filter((t) => checked[taskKey(t)])

  function send() {
    setError(null)
    startTransition(async () => {
      const result = await sendTasksToWebhookAction(selected, {
        date: today,
        note: note.trim() || null,
      })
      if (result.error) {
        setError(result.error)
        setConfirming(false)
        return
      }
      setSent(result.sent ?? selected.length)
      setChecked({})
      setNote('')
      setConfirming(false)
      router.refresh()
    })
  }

  function toggleGroep(key: TaskUrgency, aan: boolean) {
    const keys = tasks.filter((t) => urgencyOf(t) === key).map(taskKey)
    setChecked((prev) => {
      const next = { ...prev }
      for (const k of keys) next[k] = aan
      return next
    })
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            Wat er nog moet gebeuren
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {tasks.length} {tasks.length === 1 ? 'taak' : 'taken'} · te laat bovenaan, daarna
            vandaag en de komende {HORIZON_DAYS} dagen
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tabular-nums text-gray-500">
            {selected.length} aangevinkt
          </span>
          <button
            type="button"
            onClick={() => setChecked({})}
            disabled={selected.length === 0}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            alles uit
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={selected.length === 0}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
          >
            Naar Kix sturen
          </button>
        </div>
      </header>

      {sent !== null && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
          {sent} {sent === 1 ? 'taak' : 'taken'} naar Kix gestuurd. Ze staan nu onder het tabblad
          Kix taken, met de teller erbij.
        </p>
      )}

      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-900">
          {error}
        </p>
      )}

      {confirming && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            <span className="font-semibold">Dit gaat echt de deur uit.</span> Deze webhook zit niet
            achter de testgrendel, ook niet op een lokale omgeving.
          </p>

          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Wat er verstuurd wordt
            </div>
            <pre className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-800">
              {formatTasksText(selected)}
              {note.trim() && `\n\n${note.trim()}`}
            </pre>
          </div>

          <div>
            <label
              htmlFor="todo-note"
              className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500"
            >
              Bericht erbij{' '}
              <span className="font-normal normal-case text-gray-400">(optioneel)</span>
            </label>
            <textarea
              id="todo-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition-colors focus:border-indigo-400"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
            >
              Terug
            </button>
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Versturen…' : `Definitief versturen (${selected.length})`}
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
          Er staat niets open en er komt de komende {HORIZON_DAYS} dagen niets aan.
        </p>
      ) : (
        GROEPEN.map((groep) => {
          const groepTaken = tasks.filter((t) => urgencyOf(t) === groep.key)
          if (groepTaken.length === 0) return null

          const allesAan = groepTaken.every((t) => checked[taskKey(t)])

          return (
            <section key={groep.key} className={`overflow-hidden rounded-xl border ${groep.rand}`}>
              <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div>
                  <h3 className={`text-xs font-semibold ${groep.kop}`}>
                    {groep.titel}
                    <span className="ml-1.5 font-normal tabular-nums opacity-70">
                      {groepTaken.length}
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-500">{groep.uitleg}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleGroep(groep.key, !allesAan)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                >
                  {allesAan ? 'groep uit' : 'groep aan'}
                </button>
              </div>

              <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-white">
                {groepTaken.map((task) => {
                  const key = taskKey(task)
                  const eerder = verstuurd.get(`${task.clientId}|${storageKindFor(task.kind)}`)
                  return (
                    <li key={key}>
                      <label className="flex cursor-pointer items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked[key] ?? false}
                          onChange={(e) =>
                            setChecked((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                        />
                        <span className="min-w-0 flex-1 text-[11px] leading-snug">
                          <span className="font-semibold text-gray-900">{task.clientName}</span>
                          <span className="text-gray-800"> — {task.label}</span>
                          <span
                            className={`ml-1 font-medium ${
                              task.status === 'overdue'
                                ? 'text-rose-600'
                                : task.status === 'due'
                                  ? 'text-amber-600'
                                  : 'text-sky-600'
                            }`}
                          >
                            ({describeTiming(task)})
                          </span>
                          {task.detail && <span className="block text-gray-400">{task.detail}</span>}
                          <span className="mt-0.5 block text-[10px] font-medium">
                            {eerder ? (
                              <span className="text-indigo-600">
                                {eerder.reminderCount}× naar Kix · laatst{' '}
                                {formatDayShort(eerder.lastSentAt.slice(0, 10))}
                                {eerder.kixNote ? ` · "${eerder.kixNote}"` : ''}
                              </span>
                            ) : (
                              <span className="text-gray-300">nog niet naar Kix</span>
                            )}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

/** Eén klant kan meerdere taken hebben, maar niet twee van dezelfde soort. */
function taskKey(task: LoopgangTask): string {
  return `${task.clientId}|${task.kind}`
}
