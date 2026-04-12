'use client'

import { useState, useTransition } from 'react'
import { sendClientMail, MAIL_CATEGORIES, type MailCategory } from '../actions'

interface Props {
  clients: { id: string; name: string }[]
}

export function MailClientForm({ clients }: Props) {
  const [pending, startTransition] = useTransition()
  const [clientId, setClientId] = useState('')
  const [category, setCategory] = useState<MailCategory | ''>('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedCat = MAIL_CATEGORIES.find((c) => c.id === category)
  const showTextInput = selectedCat?.hasTextInput || false

  const groups = Array.from(new Set(MAIL_CATEGORIES.map((c) => c.group)))

  const canSubmit = !!clientId && !!category && !pending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setFeedback(null)
    startTransition(async () => {
      const result = await sendClientMail({
        clientId,
        category: category as MailCategory,
        message,
      })
      if (result.error) {
        setFeedback({ type: 'error', text: result.error })
      } else {
        setFeedback({ type: 'success', text: 'Mail is verstuurd naar de klant.' })
        setCategory('')
        setMessage('')
        setTimeout(() => setFeedback(null), 5000)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Select client */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
            1
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Selecteer klant</h3>
            <p className="mt-0.5 text-xs text-gray-500">Kies naar wie je de mail wilt versturen.</p>
          </div>
        </div>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">Kies een klant...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </section>

      {/* Step 2: Select reason */}
      {clientId && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
              2
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Kies de reden</h3>
              <p className="mt-0.5 text-xs text-gray-500">Waarover wil je de klant mailen?</p>
            </div>
          </div>

          <div className="space-y-5">
            {groups.map((group) => {
              const items = MAIL_CATEGORIES.filter((c) => c.group === group)
              return (
                <div key={group}>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {group}
                  </div>
                  <div className="space-y-2">
                    {items.map((cat) => {
                      const active = category === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategory(cat.id)
                            if (!cat.hasTextInput) setMessage('')
                          }}
                          className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                            active
                              ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-100'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                              active ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'
                            }`}
                          >
                            {active && <div className="h-2 w-2 rounded-full bg-white" />}
                          </div>
                          <span
                            className={`text-sm font-medium ${
                              active ? 'text-indigo-900' : 'text-gray-700'
                            }`}
                          >
                            {cat.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Optional text input */}
          {showTextInput && (
            <div className="mt-4">
              <label
                htmlFor="message"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                Toelichting (optioneel)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Schrijf een toelichting die meeverzonden wordt..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
            </div>
          )}
        </section>
      )}

      {/* Submit */}
      {clientId && category && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-gray-900">Klaar om te versturen</div>
              <p className="mt-0.5 text-xs text-gray-500">
                Mail wordt verstuurd naar{' '}
                <span className="font-semibold text-gray-900">
                  {clients.find((c) => c.id === clientId)?.name ?? 'geselecteerde klant'}
                </span>
              </p>
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {pending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  Versturen...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  Verstuur mail
                </>
              )}
            </button>
          </div>

          {feedback && (
            <div
              className={`mt-4 rounded-xl p-3 text-sm font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-red-50 text-red-700 ring-1 ring-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </section>
      )}
    </form>
  )
}
