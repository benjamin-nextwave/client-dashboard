'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { KixTask } from '@/lib/data/loopgang-kix-tasks'
import { MEETING_TASK_KINDS } from '@/lib/data/loopgang-kix-tasks'
import { updateKixTaskAction, deleteKixTaskAction } from '../actions'
import { formatDayShort } from './dialogs'

/**
 * Alles wat er naar Kix is gestuurd, met wat er is teruggekomen.
 *
 * Dit is het geheugen van de takenlijst: per taak staat hoe vaak hij is
 * verstuurd en wanneer voor het laatst, zodat dezelfde openstaande factuur niet
 * drie dagen op rij de deur uit gaat. De notitie en de meetingdatum vullen aan
 * wat Kix heeft gedaan.
 *
 * Afronden verzet de cyclus niet. Een factuur telt pas als verstuurd zodra hij
 * als factuur is vastgelegd — met bedrag en datum, via het dagpaneel. Deze knop
 * zegt alleen "hier is Kix mee klaar".
 */

type Filter = 'open' | 'done' | 'all'

const FILTER_LABELS: Record<Filter, string> = {
  open: 'Open',
  done: 'Afgerond',
  all: 'Alles',
}

export function KixTasksView({ tasks }: { tasks: KixTask[] }) {
  const [filter, setFilter] = useState<Filter>('open')

  const zichtbaar = useMemo(
    () => tasks.filter((t) => (filter === 'all' ? true : t.status === filter)),
    [tasks, filter]
  )

  const openCount = tasks.filter((t) => t.status === 'open').length

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Kix taken</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {openCount} open van {tasks.length} verstuurd · de teller telt op zodra dezelfde taak
            opnieuw de deur uit gaat
          </p>
        </div>

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
      </header>

      {zichtbaar.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-500">
          {tasks.length === 0
            ? 'Er is nog niets naar Kix gestuurd. Dat gebeurt vanaf het tabblad Te doen.'
            : 'Geen taken in dit filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {zichtbaar.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task }: { task: KixTask }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [note, setNote] = useState(task.kixNote ?? '')
  const [meetingDate, setMeetingDate] = useState(task.meetingDate ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const meetingTaak = MEETING_TASK_KINDS.includes(task.kind)
  const gewijzigd = note !== (task.kixNote ?? '') || meetingDate !== (task.meetingDate ?? '')
  const afgerond = task.status === 'done'

  function save(extra?: { status?: 'open' | 'done' }) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateKixTaskAction({
        id: task.id,
        kixNote: note,
        meetingDate: meetingDate === '' ? null : meetingDate,
        ...extra,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  function remove() {
    setError(null)
    startTransition(async () => {
      const result = await deleteKixTaskAction(task.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <article
      className={`rounded-xl border bg-white p-4 ${
        afgerond ? 'border-gray-200 opacity-70' : 'border-gray-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold text-gray-900">{task.clientName}</h3>
            {afgerond ? (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                afgerond
                {task.completedAt ? ` · ${formatDayShort(task.completedAt.slice(0, 10))}` : ''}
              </span>
            ) : (
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                open
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-800">{task.label}</p>
          {task.detail && <p className="text-[11px] text-gray-400">{task.detail}</p>}
        </div>

        <div className="text-right text-[10px] leading-snug text-gray-500">
          <div className="font-semibold tabular-nums text-gray-700">
            {task.reminderCount}× verstuurd
          </div>
          <div className="tabular-nums">
            laatst {formatDayShort(task.lastSentAt.slice(0, 10))}
          </div>
          {task.reminderCount > 1 && (
            <div className="tabular-nums">
              eerste keer {formatDayShort(task.firstSentAt.slice(0, 10))}
            </div>
          )}
          {task.dueDate && (
            <div className="tabular-nums">moest op {formatDayShort(task.dueDate)}</div>
          )}
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${meetingTaak ? 'sm:grid-cols-[1fr_auto]' : ''}`}>
        <div>
          <label
            htmlFor={`note-${task.id}`}
            className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500"
          >
            Notitie
          </label>
          <textarea
            id={`note-${task.id}`}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Wat is er gedaan of afgesproken?"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition-colors focus:border-indigo-400"
          />
        </div>

        {/* Alleen bij het regelen van de meeting. Een betaaltermijn of een
            verzonden leadrapport vraagt om een vinkje, niet om een datum — en een
            leeg datumveld op elke kaart nodigt uit tot invullen wat er niet toe
            doet. */}
        <div className={meetingTaak ? '' : 'hidden'}>
          <label
            htmlFor={`date-${task.id}`}
            className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500"
          >
            Meetingdatum
          </label>
          <input
            id={`date-${task.id}`}
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition-colors focus:border-indigo-400"
          />
          <p className="mt-1 max-w-[14rem] text-[10px] leading-snug text-gray-400">
            Alleen een aantekening. De cyclus verzetten gaat via “Kix toevoegen”.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-[10px] font-semibold text-gray-300 transition-colors hover:text-rose-600 disabled:opacity-50"
        >
          verwijderen
        </button>

        <div className="flex items-center gap-2">
          {saved && !gewijzigd && (
            <span className="text-[10px] font-semibold text-emerald-600">opgeslagen</span>
          )}
          <button
            type="button"
            onClick={() => save()}
            disabled={pending || !gewijzigd}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
          >
            {pending ? 'Opslaan…' : 'Opslaan'}
          </button>
          <button
            type="button"
            onClick={() => save({ status: afgerond ? 'open' : 'done' })}
            disabled={pending}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
              afgerond
                ? 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {afgerond ? 'Heropenen' : 'Afronden'}
          </button>
        </div>
      </div>
    </article>
  )
}
