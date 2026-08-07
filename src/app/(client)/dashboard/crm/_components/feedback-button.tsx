'use client'

import { useState, useTransition } from 'react'
import { sendCrmFeedback, type FeedbackKind } from '../_lib/feedback-actions'

/**
 * Of deze knop nog getoond wordt beslist page.tsx op de server (zie
 * FEEDBACK_HIDDEN_FROM), zodat een verzette computerklok hem niet terughaalt.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<FeedbackKind | null>(null)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function close() {
    setOpen(false)
    setKind(null)
    setMessage('')
    setSent(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!kind) {
      setError('Kies eerst Feedback of Klacht.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await sendCrmFeedback(kind, message)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setSent(true)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-muted transition hover:border-[var(--brand-32)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.019Z" />
        </svg>
        Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] backdrop-blur-sm"
            onClick={() => !pending && close()}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-panel bg-panel shadow-2xl ring-1 ring-line">
            <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-fg">
                  Feedback of klacht over het CRM
                </h2>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  Je bericht komt rechtstreeks bij ons binnen.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-control p-1.5 text-faint hover:bg-track hover:text-muted disabled:opacity-50"
                aria-label="Sluiten"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {sent ? (
              <div className="px-5 py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)]">
                  <svg className="h-6 w-6 text-pos" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
                <p className="mt-3 text-[12.5px] font-medium text-fg">Verzonden. Bedankt!</p>
                <p className="mt-1 text-[11.5px] text-muted">We nemen je bericht mee.</p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-4 rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90"
                >
                  Sluiten
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
                <div>
                  <span className="text-[11.5px] font-medium text-muted">
                    Waar gaat het over?
                  </span>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(
                      [
                        ['feedback', 'Feedback'],
                        ['klacht', 'Klacht'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setKind(id)
                          setError(null)
                        }}
                        aria-pressed={kind === id}
                        className={`rounded-control border px-3 py-2.5 text-[12.5px] font-medium transition ${
                          kind === id
                            ? id === 'klacht'
                              ? 'border-[color-mix(in_oklab,var(--color-neg)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] text-neg'
                              : 'border-[color-mix(in_oklab,var(--color-pos)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)] text-pos'
                            : 'border-line bg-panel text-muted hover:border-[var(--brand-32)]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="text-[11.5px] font-medium text-muted">
                    Je bericht
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={pending}
                    maxLength={5000}
                    placeholder={
                      kind === 'klacht'
                        ? 'Wat gaat er mis?'
                        : 'Wat kan er beter, of wat werkt juist goed?'
                    }
                    className="mt-1 block min-h-[130px] w-full resize-y rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] outline-none transition focus:border-[var(--brand-40)] disabled:bg-track"
                  />
                </label>

                {error && (
                  <p className="rounded-control bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-3 py-2 text-[11.5px] text-neg">{error}</p>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    disabled={pending}
                    className="rounded-control px-3 py-2 text-[12.5px] font-medium text-muted hover:bg-track"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    disabled={pending || !kind || !message.trim()}
                    className="rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {pending ? 'Verzenden…' : 'Verzenden'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
