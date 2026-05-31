'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientDncAdminNote } from '../actions'

interface Props {
  clientId: string
  initialNote: string | null
}

export function DncAdminNote({ clientId, initialNote }: Props) {
  const router = useRouter()
  const [text, setText] = useState(initialNote ?? '')
  const [savedText, setSavedText] = useState(initialNote ?? '')
  const [pending, startTransition] = useTransition()

  const dirty = text !== savedText

  const handleSave = () => {
    startTransition(async () => {
      await updateClientDncAdminNote(clientId, text)
      setSavedText(text)
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Interne notitie</h2>
          <p className="text-xs text-gray-500">Vrij tekstvak — alleen zichtbaar in de admin-omgeving.</p>
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
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        placeholder="Opmerkingen, contextuele info, beslissingen rond de DNC-lijst…"
      />
    </section>
  )
}
