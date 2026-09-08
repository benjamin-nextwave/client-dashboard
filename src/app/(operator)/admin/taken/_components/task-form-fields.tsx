'use client'

import {
  TASK_PERSONS,
  TASK_PERSON_LABEL,
  type TaskPerson,
} from '@/lib/data/controle'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {hint && <p className="mb-2 text-[11px] leading-snug text-gray-500">{hint}</p>}
      {children}
    </div>
  )
}

/**
 * Schakelaar die de ontvanger vertelt dat hij zich na afronding moet melden.
 * Zonder "namens wie" is nog niet bekend bij wie — de knop blijft bruikbaar,
 * de ondertekst zegt dan alleen "de aanvrager".
 */
export function NotifyToggle({
  value,
  onChange,
  requestedBy,
}: {
  value: boolean
  onChange: (v: boolean) => void
  requestedBy: TaskPerson | ''
}) {
  const who = requestedBy ? TASK_PERSON_LABEL[requestedBy] : 'de aanvrager'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
        value
          ? 'border-indigo-200 bg-indigo-50/60'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
          value ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            value ? 'left-4.5' : 'left-0.5'
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className={`block text-xs font-bold ${value ? 'text-indigo-900' : 'text-gray-700'}`}>
          Contacteren na afronding
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
          {value
            ? `Op de taak komt te staan dat ${who} bericht wil zodra het klaar is.`
            : `De ontvanger hoeft ${who} niet te laten weten dat het klaar is.`}
        </span>
      </span>
    </button>
  )
}

export function PersonPicker({
  value,
  onChange,
  name,
}: {
  value: TaskPerson | ''
  onChange: (v: TaskPerson) => void
  name: string
}) {
  return (
    <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1">
      {TASK_PERSONS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          aria-label={`${name}: ${TASK_PERSON_LABEL[p]}`}
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
            value === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {TASK_PERSON_LABEL[p]}
        </button>
      ))}
    </div>
  )
}
