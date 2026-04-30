'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  OUTCOME_META,
  type CampaignFlowOutcome,
  type FlowDropoffReason,
  type FlowResponsibility,
} from '@/lib/data/campaign-flow'
import { updateOutcome } from '../actions'

interface Props {
  outcome: CampaignFlowOutcome
  disabled?: boolean
}

export function OutcomeEditor({ outcome, disabled }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [label, setLabel] = useState(outcome.label)
  const [responsibility, setResponsibility] = useState<FlowResponsibility | null>(
    outcome.responsibility
  )
  const [reasons, setReasons] = useState<FlowDropoffReason[]>(outcome.dropoffReasons)
  const [saved, setSaved] = useState(false)

  const meta = OUTCOME_META[outcome.kind]

  const reasonsAreEqual =
    reasons.length === outcome.dropoffReasons.length &&
    reasons.every((r, i) => r.label === outcome.dropoffReasons[i]?.label)

  const isDirty =
    label !== outcome.label ||
    responsibility !== outcome.responsibility ||
    !reasonsAreEqual

  const save = () => {
    if (!isDirty) return
    startTransition(async () => {
      const result = await updateOutcome(outcome.id, {
        label,
        responsibility,
        dropoffReasons: outcome.kind === 'dropoff' ? reasons : undefined,
      })
      if (!result.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
        router.refresh()
      }
    })
  }

  const updateReasonLabel = (idx: number, newLabel: string) => {
    setReasons((prev) => prev.map((r, i) => (i === idx ? { ...r, label: newLabel } : r)))
  }

  const removeReason = (idx: number) => {
    setReasons((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, position: i })))
  }

  const addReason = () => {
    setReasons((prev) => [...prev, { label: '', position: prev.length }])
  }

  const moveReason = (idx: number, direction: 'up' | 'down') => {
    setReasons((prev) => {
      const next = [...prev]
      const swap = direction === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next.map((r, i) => ({ ...r, position: i }))
    })
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${meta.softBorder} ${meta.softBg} shadow-sm`}
    >
      <div className="flex items-center gap-3 border-b border-white/40 px-4 py-2.5">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${meta.badge} text-[10px] font-bold`}
        >
          {outcome.kind === 'continue' ? '↓' : outcome.kind === 'success' ? '✓' : '×'}
        </span>
        <div className="flex-1">
          <div className={`text-[10px] font-semibold uppercase tracking-wide ${meta.softText}`}>
            {meta.label}
          </div>
        </div>
        {isDirty && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
            Onopgeslagen
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Label voor klant
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={save}
              disabled={disabled || pending}
              placeholder={meta.label}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          {outcome.kind !== 'continue' && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Verantwoordelijk voor afhandeling
              </label>
              <select
                value={responsibility ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  setResponsibility(v === '' ? null : (v as FlowResponsibility))
                }}
                onBlur={save}
                disabled={disabled || pending}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Niet toegewezen</option>
                <option value="client">Door klant</option>
                <option value="nextwave">Door Nextwave</option>
              </select>
            </div>
          )}
        </div>

        {outcome.kind === 'dropoff' && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Afhaak-redenen
              </label>
              <button
                type="button"
                onClick={addReason}
                disabled={disabled || pending}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                + Reden toevoegen
              </button>
            </div>
            <div className="space-y-1.5">
              {reasons.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-3 text-center text-[11px] text-gray-400">
                  Nog geen redenen
                </div>
              )}
              {reasons.map((reason, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={reason.label}
                    onChange={(e) => updateReasonLabel(idx, e.target.value)}
                    onBlur={save}
                    disabled={disabled || pending}
                    placeholder={`Reden ${idx + 1}`}
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => moveReason(idx, 'up')}
                    disabled={idx === 0 || disabled || pending}
                    className="rounded-md border border-gray-200 bg-white p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveReason(idx, 'down')}
                    disabled={idx === reasons.length - 1 || disabled || pending}
                    className="rounded-md border border-gray-200 bg-white p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeReason(idx)}
                    disabled={disabled || pending}
                    className="rounded-md border border-red-100 bg-white p-1 text-red-500 hover:bg-red-50 disabled:opacity-50"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {!reasonsAreEqual && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={save}
                  disabled={disabled || pending}
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
                >
                  Redenen opslaan
                </button>
              </div>
            )}
          </div>
        )}

        {saved && (
          <div className="text-right text-[11px] font-semibold text-emerald-600">Opgeslagen</div>
        )}
      </div>
    </div>
  )
}
