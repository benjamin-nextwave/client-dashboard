'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTargetAudienceList, type TargetAudienceList } from '../actions'

interface Props {
  clientId: string
  list: TargetAudienceList
  accent: string
  tone: 'include' | 'exclude'
  title: string
  description: string
  placeholder: string
  initialValues: string[]
}

export function TagListEditor({
  clientId,
  list,
  accent,
  tone,
  title,
  description,
  placeholder,
  initialValues,
}: Props) {
  const router = useRouter()
  const [values, setValues] = useState<string[]>(initialValues)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function save(next: string[]) {
    setValues(next)
    setError(null)
    startTransition(async () => {
      const result = await updateTargetAudienceList(clientId, list, next)
      if (result.error) setError(result.error)
      router.refresh()
    })
  }

  function handleAdd() {
    // Een plakactie met komma's levert vaak meerdere waarden tegelijk op.
    const parts = draft
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
    if (parts.length === 0) return

    const next = [...values]
    for (const part of parts) {
      if (next.some((v) => v.toLowerCase() === part.toLowerCase())) continue
      next.push(part)
    }
    setDraft('')
    if (next.length !== values.length) save(next)
  }

  function handleRemove(index: number) {
    save(values.filter((_, i) => i !== index))
  }

  const chipStyle =
    tone === 'exclude'
      ? { borderColor: '#fecaca', background: '#fef2f2', color: '#991b1b' }
      : { borderColor: `${accent}55`, background: '#ffffff', color: '#1f2937' }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {pending && <span className="shrink-0 text-[11px] text-gray-400">Opslaan…</span>}
      </div>

      {error && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {values.map((value, idx) => (
          <span
            key={`${value}-${idx}`}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm"
            style={chipStyle}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: tone === 'exclude' ? '#dc2626' : accent }}
            />
            {value}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              disabled={pending}
              className="ml-0.5 rounded-full p-0.5 text-gray-400 hover:bg-black/5 hover:text-red-600 disabled:opacity-50"
              aria-label={`Verwijder ${value}`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-xs italic text-gray-400">Nog niets toegevoegd.</span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || draft.trim().length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Toevoegen
        </button>
      </div>
    </section>
  )
}
