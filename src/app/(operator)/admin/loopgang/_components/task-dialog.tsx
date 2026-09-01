'use client'

import { useState, useTransition } from 'react'
import {
  describeTiming,
  formatTasksText,
  type LoopgangTask,
} from '@/lib/loopgang/tasks'
import { Modal } from './dialogs'
import { sendTasksToWebhookAction } from '../actions'

interface Props {
  tasks: LoopgangTask[]
  today: string
  onClose: () => void
}

/**
 * De taken van vandaag, aanvinkbaar, met een voorbeeld van wat er verstuurd
 * wordt.
 *
 * Bewust twee stappen: eerst kiezen, dan het voorbeeld zien, dan pas versturen.
 * Deze webhook zit niet achter de testgrendel — één klik en de mail gaat echt de
 * deur uit — en dan hoort er iets tussen te zitten dat je laat zien wát je
 * verstuurt.
 */
export function TaskDialog({ tasks, today, onClose }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((task) => [taskKey(task), true]))
  )

  const selected = tasks.filter((task) => checked[taskKey(task)])

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
    })
  }

  if (sent !== null) {
    return (
      <Modal title="Verstuurd" subtitle="Make heeft de taken aangenomen." onClose={onClose}>
        <div className="space-y-3">
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-900">
            {sent} {sent === 1 ? 'taak' : 'taken'} naar Kix gestuurd.
          </p>
          <p className="text-[11px] text-gray-500">
            Of er ook een mail uitgaat hangt af van het scenario in Make. Dat kunnen wij hier niet
            zien — controleer het daar als je het zeker wilt weten.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={ghostButton}>
              Sluiten
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Taken van vandaag"
      subtitle={`${tasks.length} ${tasks.length === 1 ? 'taak' : 'taken'} openstaand · vink aan wat naar Kix gaat`}
      onClose={onClose}
    >
      {tasks.length === 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Er staat vandaag niets open. Alles wat moest gebeuren is gebeurd, of staat verderop in
            de maand.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={ghostButton}>
              Sluiten
            </button>
          </div>
        </div>
      ) : confirming ? (
        <div className="space-y-3">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
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

          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[11px] font-semibold text-gray-400 hover:text-gray-900"
            >
              Terug
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={ghostButton}>
                Annuleren
              </button>
              <button type="button" onClick={send} disabled={pending} className={primaryButton}>
                {pending ? 'Versturen…' : `Definitief versturen (${selected.length})`}
              </button>
            </div>
          </div>

          <ErrorLine text={error} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold tabular-nums text-gray-500">
              {selected.length} van {tasks.length} aangevinkt
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setChecked(Object.fromEntries(tasks.map((t) => [taskKey(t), true])))
                }
                className="font-semibold text-gray-500 hover:text-gray-900"
              >
                alles aan
              </button>
              <button
                type="button"
                onClick={() =>
                  setChecked(Object.fromEntries(tasks.map((t) => [taskKey(t), false])))
                }
                className="font-semibold text-gray-400 hover:text-gray-900"
              >
                alles uit
              </button>
            </div>
          </div>

          <ul className="max-h-72 space-y-0.5 overflow-y-auto rounded-xl border border-gray-100 p-1">
            {tasks.map((task) => {
              const key = taskKey(task)
              return (
                <li key={key}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={checked[key] ?? false}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <span className="text-[11px] leading-snug">
                      <span className="font-semibold text-gray-900">{task.clientName}</span>
                      <span className="text-gray-800"> — {task.label}</span>
                      <span
                        className={`ml-1 font-medium ${
                          task.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'
                        }`}
                      >
                        ({describeTiming(task)})
                      </span>
                      {task.detail && (
                        <span className="block text-gray-400">{task.detail}</span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div>
            <label
              className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500"
              htmlFor="taskNote"
            >
              Bericht erbij <span className="font-normal normal-case text-gray-400">(optioneel)</span>
            </label>
            <textarea
              id="taskNote"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <ErrorLine text={error} />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className={ghostButton}>
              Annuleren
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={selected.length === 0}
              className={primaryButton}
            >
              Naar Kix sturen
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/** Eén klant kan meerdere taken hebben, maar niet twee van dezelfde soort. */
function taskKey(task: LoopgangTask): string {
  return `${task.clientId}|${task.kind}`
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
      {text}
    </p>
  )
}

const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50'

const ghostButton =
  'inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50'
