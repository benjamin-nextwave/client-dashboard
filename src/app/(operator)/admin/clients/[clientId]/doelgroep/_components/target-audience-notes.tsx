'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateTargetAudienceNotes } from '../actions'

interface Props {
  clientId: string
  initialNotes: string
}

export function TargetAudienceNotes({ clientId, initialNotes }: Props) {
  const router = useRouter()
  const [text, setText] = useState(initialNotes)
  const [savedText, setSavedText] = useState(initialNotes)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const dirty = text !== savedText

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateTargetAudienceNotes(clientId, text)
      if (result.error) {
        setError(result.error)
        return
      }
      setSavedText(text)
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Notities</h2>
          <p className="text-xs text-gray-500">
            Vrij tekstvak — alleen zichtbaar in de admin-omgeving.
          </p>
        </div>
        {dirty ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Opslaan…' : 'Opslaan'}
          </button>
        ) : (
          <span className="text-[11px] text-gray-400">Opgeslagen</span>
        )}
      </div>

      {error && (
        <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
          {error}
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        placeholder="Afspraken over de doelgroep, bedrijfsgroottes, uitzonderingen, waarom bepaalde sectoren wel of niet meedoen…"
      />
    </section>
  )
}
