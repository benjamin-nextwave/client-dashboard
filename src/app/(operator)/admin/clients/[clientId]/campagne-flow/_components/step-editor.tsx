'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CampaignFlowStep, CampaignFlowVariant } from '@/lib/data/campaign-flow'
import {
  addVariant,
  deleteStep,
  deleteVariant,
  moveStep,
  updateStepTitle,
  updateVariant,
} from '../actions'
import { OutcomeEditor } from './outcome-editor'

interface Props {
  step: CampaignFlowStep
  stepLabel: string
  isFirst: boolean
  isLast: boolean
  disabled?: boolean
}

export function StepEditor({ step, stepLabel, isFirst, isLast, disabled }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState(step.title)
  const [titleSaved, setTitleSaved] = useState(false)
  const [expandedVariantId, setExpandedVariantId] = useState<string | null>(null)

  const titleDirty = title !== step.title

  const saveTitle = () => {
    if (!titleDirty) return
    setError(null)
    startTransition(async () => {
      const result = await updateStepTitle(step.id, title)
      if (result.error) setError(result.error)
      else {
        setTitleSaved(true)
        setTimeout(() => setTitleSaved(false), 1500)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`${stepLabel} verwijderen? Alle varianten en uitkomsten gaan verloren.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteStep(step.id)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleMove = (direction: 'up' | 'down') => {
    setError(null)
    startTransition(async () => {
      const result = await moveStep(step.id, direction)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleAddVariant = () => {
    setError(null)
    startTransition(async () => {
      const result = await addVariant(step.id)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  // Outcomes per kind
  const continueOutcome = step.outcomes.find((o) => o.kind === 'continue')
  const successOutcome = step.outcomes.find((o) => o.kind === 'success')
  const dropoffOutcome = step.outcomes.find((o) => o.kind === 'dropoff')

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50/40 via-white to-white px-5 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/30">
          {step.stepNumber}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            {stepLabel}
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            disabled={disabled || pending}
            placeholder="Titel van deze stap"
            className="mt-0.5 block w-full max-w-md rounded-md bg-transparent text-base font-semibold text-gray-900 outline-none ring-0 hover:bg-white/60 focus:bg-white focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div className="flex items-center gap-1">
          {titleDirty && (
            <button
              type="button"
              onClick={saveTitle}
              disabled={pending}
              className="rounded-lg bg-amber-500 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
            >
              Opslaan
            </button>
          )}
          {titleSaved && (
            <span className="text-[10px] font-semibold text-emerald-600">Opgeslagen</span>
          )}
          <button
            type="button"
            onClick={() => handleMove('up')}
            disabled={isFirst || pending}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30"
            title="Omhoog"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => handleMove('down')}
            disabled={isLast || pending}
            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-500 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30"
            title="Omlaag"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-lg border border-red-100 bg-white p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
            title="Verwijderen"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5 p-5">
        {/* Variants section */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                Varianten
              </h3>
              <p className="mt-0.5 text-[11px] text-gray-500">
                {step.variants.length} {step.variants.length === 1 ? 'variant' : 'varianten'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddVariant}
              disabled={pending || disabled}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Variant toevoegen
            </button>
          </div>

          {step.variants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-xs text-gray-400">
              Nog geen varianten
            </div>
          ) : (
            <div className="space-y-2">
              {step.variants.map((variant) => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  expanded={expandedVariantId === variant.id}
                  onToggle={() =>
                    setExpandedVariantId(expandedVariantId === variant.id ? null : variant.id)
                  }
                  disabled={pending || disabled}
                />
              ))}
            </div>
          )}
        </div>

        {/* Outcomes section */}
        <div>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
            Uitkomsten
          </h3>
          <div className="grid gap-3">
            {!isLast && continueOutcome && (
              <OutcomeEditor outcome={continueOutcome} disabled={pending || disabled} />
            )}
            {successOutcome && (
              <OutcomeEditor outcome={successOutcome} disabled={pending || disabled} />
            )}
            {dropoffOutcome && (
              <OutcomeEditor outcome={dropoffOutcome} disabled={pending || disabled} />
            )}
          </div>
          {isLast && (
            <p className="mt-2 text-[11px] text-gray-400">
              Laatste stap — &ldquo;Geen reactie&rdquo; tak wordt voor de klant niet getoond.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function VariantCard({
  variant,
  expanded,
  onToggle,
  disabled,
}: {
  variant: CampaignFlowVariant
  expanded: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const [label, setLabel] = useState(variant.label)
  const [subject, setSubject] = useState(variant.subject)
  const [body, setBody] = useState(variant.body)
  const [exampleBody, setExampleBody] = useState(variant.exampleBody)
  const [saved, setSaved] = useState(false)

  const isDirty =
    label !== variant.label ||
    subject !== variant.subject ||
    body !== variant.body ||
    exampleBody !== variant.exampleBody

  const handleSave = () => {
    startSave(async () => {
      const result = await updateVariant(variant.id, { label, subject, body, exampleBody })
      if (!result.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`Variant "${variant.label}" verwijderen?`)) return
    startSave(async () => {
      const result = await deleteVariant(variant.id)
      if (!result.error) router.refresh()
    })
  }

  const handleToggle = () => {
    if (expanded && isDirty) handleSave()
    onToggle()
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm ${
        isDirty ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
              isDirty ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {label.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{label || 'Geen label'}</div>
            <div className="truncate text-xs text-gray-500">{subject || 'Geen onderwerp'}</div>
          </div>
          {isDirty && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
              Onopgeslagen
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50/30 p-4">
          <Field label="Label">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={disabled || saving}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </Field>
          <Field label="Onderwerp">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Bv. Samen {{company}} laten groeien"
              disabled={disabled || saving}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Mail body (met variabelen)">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Hallo {{voornaam}}, ik zag dat {{bedrijf}}..."
                disabled={disabled || saving}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </Field>
            <Field label="Ingevuld voorbeeld">
              <textarea
                value={exampleBody}
                onChange={(e) => setExampleBody(e.target.value)}
                rows={8}
                placeholder="Hallo Jan, ik zag dat Jansen BV..."
                disabled={disabled || saving}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </Field>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || saving}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Verwijderen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || saving || !isDirty}
              className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-xs font-bold shadow-sm transition-all ${
                isDirty && !saving
                  ? 'bg-amber-500 text-white shadow-amber-500/30 hover:-translate-y-0.5 hover:bg-amber-600'
                  : 'bg-gray-200 text-gray-400'
              } disabled:cursor-not-allowed`}
            >
              {saved ? 'Opgeslagen' : isDirty ? 'Opslaan' : 'Opgeslagen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {children}
    </div>
  )
}
