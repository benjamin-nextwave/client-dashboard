'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientCompanyKnowledge } from '../overview-actions'
import {
  normalizeCompanyKnowledgeChecklist,
  type CompanyKnowledgeChecklist,
  type CompanyKnowledgeKey,
} from './company-knowledge-shared'

const QUESTIONS: { key: CompanyKnowledgeKey; question: string }[] = [
  { key: 'essentie', question: 'Wat is de essentie van het bedrijf?' },
  { key: 'diensten', question: 'Wat zijn de diensten specifiek?' },
  { key: 'icp', question: 'Wat is hun ICP, en wat is de bredere doelgroep waar ze mee kunnen werken?' },
  { key: 'grootte', question: 'Hoe groot is het bedrijf ongeveer?' },
  { key: 'kernwaarden', question: 'Wat zijn de kernwaarden van het bedrijf?' },
  { key: 'opgericht', question: 'Wanneer is het bedrijf opgericht?' },
  { key: 'uniek', question: 'Andere unieke eigenschappen, dingen die opvallen of benoemenswaardig zijn?' },
]

interface Props {
  clientId: string
  initialText: string | null
  initialChecklist: unknown
  initialComplete: boolean
}

export function ClientKnowledgeButton({
  clientId,
  initialText,
  initialChecklist,
  initialComplete,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(initialText ?? '')
  const [checklist, setChecklist] = useState<CompanyKnowledgeChecklist>(() =>
    normalizeCompanyKnowledgeChecklist(initialChecklist)
  )
  const [complete, setComplete] = useState(initialComplete)
  const [pending, startTransition] = useTransition()

  const checkedCount = Object.values(checklist).filter(Boolean).length

  const toggleQuestion = (key: CompanyKnowledgeKey) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    startTransition(async () => {
      await updateClientCompanyKnowledge(clientId, {
        text,
        checklist,
        complete,
      })
      router.refresh()
    })
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`group flex w-full items-center justify-between gap-4 rounded-2xl border px-6 py-4 text-left shadow-sm transition-all hover:shadow-md ${
          initialComplete
            ? 'border-emerald-300 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'
            : 'border-red-300 bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
        }`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            {initialComplete ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            )}
          </span>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wide opacity-90">
              {initialComplete ? 'Bedrijf in kaart gebracht' : 'Leer dit bedrijf kennen'}
            </div>
            <div className="text-xs opacity-80">
              {initialComplete
                ? 'Klik om de diepere bedrijfssamenvatting te bekijken of bij te werken.'
                : 'Schrijf een diepere samenvatting zodat je dit bedrijf écht leert kennen.'}
            </div>
          </div>
        </div>
        <svg
          className={`h-5 w-5 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Diepere bedrijfssamenvatting</h3>
                <p className="text-xs text-gray-500">
                  Schrijf hier alles wat helpt om dit bedrijf écht te leren kennen. Gebruik de checklist als
                  geheugensteun.
                </p>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Essentie van het bedrijf, diensten, ICP, grootte, kernwaarden, oprichtingsjaar, unieke eigenschappen…"
              />
            </div>

            <aside className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Checklist</h3>
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  {checkedCount}/{QUESTIONS.length}
                </span>
              </div>
              <ul className="space-y-2">
                {QUESTIONS.map(({ key, question }) => {
                  const checked = checklist[key]
                  return (
                    <li key={key}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5 transition-colors hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleQuestion(key)}
                          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span
                          className={`text-xs leading-relaxed ${
                            checked ? 'text-gray-400 line-through' : 'text-gray-700'
                          }`}
                        >
                          {question}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </aside>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={complete}
                onChange={(e) => setComplete(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-gray-800">Markeer als compleet</span>
              <span className="text-xs text-gray-500">— knop wordt dan groen</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {pending ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
