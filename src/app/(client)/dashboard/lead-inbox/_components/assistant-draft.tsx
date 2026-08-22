'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendReply } from '../_lib/actions'
import { useAssistant } from './assistant-context'

/**
 * Het voorstel van de assistent, boven de thread. Er wordt nooit iets
 * verstuurd zonder dat de gebruiker op Verzenden klikt — de knop roept
 * dezelfde sendReply aan als het gewone antwoordformulier.
 */
export function AssistantDraft({
  leadId,
  canReply,
  isTrashed,
  replyToSubject,
  sendingAccount,
  toEmail,
}: {
  leadId: string
  canReply: boolean
  isTrashed: boolean
  replyToSubject: string
  sendingAccount: string
  toEmail: string
}) {
  const router = useRouter()
  const { enabled, draftFor, requestDraft, discardDraft, updateDraft, markSent } =
    useAssistant()

  const state = draftFor(leadId)
  const active = enabled && canReply && !isTrashed

  const initialSubject = replyToSubject.toLowerCase().startsWith('re:')
    ? replyToSubject
    : `Re: ${replyToSubject}`

  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState(initialSubject)
  const [editBody, setEditBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, startSending] = useTransition()

  useEffect(() => {
    if (!active) return
    if (state.status !== 'idle') return
    requestDraft(leadId)
  }, [active, state.status, leadId, requestDraft])

  if (!active) return null
  if (state.status === 'discarded') return null

  if (state.status === 'sent') {
    return (
      <div className="rounded-panel border border-[color-mix(in_oklab,var(--c-pos)_35%,var(--c-line))] bg-[color-mix(in_oklab,var(--c-pos)_7%,transparent)] px-5 py-3.5 text-[12.5px] text-pos">
        Je antwoord is verstuurd.
      </div>
    )
  }

  function beginEdit(body: string) {
    setEditBody(body)
    setEditing(true)
    setError(null)
  }

  function send(body: string) {
    const trimmed = body.trim()
    const trimmedSubject = subject.trim()
    if (!trimmedSubject) {
      setError('Onderwerp mag niet leeg zijn.')
      return
    }
    if (!trimmed) {
      setError('Bericht mag niet leeg zijn.')
      return
    }
    setError(null)
    startSending(async () => {
      const res = await sendReply(leadId, trimmedSubject, trimmed)
      if (!res.ok) {
        setError(res.error)
        return
      }
      markSent(leadId)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <div className="overflow-hidden rounded-panel border border-[var(--brand-32)] bg-[var(--brand-04)]">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-12)] text-brand-ink">
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.9}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
              />
            </svg>
          </span>
          <h2 className="text-[12.5px] font-semibold tracking-[-0.01em]">Assistent reactie</h2>
        </div>
        <p className="text-[11px] text-muted">
          Voorstel — er wordt niets verstuurd tot je op Verzenden klikt.
        </p>
      </header>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 px-5 py-6 text-[12.5px] text-muted">
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4l3-3-3-3v4a8 8 0 1 0 8 8h-2a6 6 0 1 1-12 0z"
              className="opacity-75"
            />
          </svg>
          De assistent schrijft een antwoord…
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-[12.5px] text-neg">{state.message}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => discardDraft(leadId)}
              className="rounded-control px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-[var(--brand-08)] hover:text-fg"
            >
              Verbergen
            </button>
            <button
              type="button"
              onClick={() => requestDraft(leadId)}
              className="rounded-control border border-line bg-panel px-3 py-1.5 text-[12px] font-semibold text-fg transition-colors hover:bg-[var(--brand-08)]"
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <div className="border-b border-line px-5 py-2.5 text-[11.5px] text-muted">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                <span className="font-semibold text-fg">Van:</span> {sendingAccount}
              </span>
              <span>
                <span className="font-semibold text-fg">Aan:</span> {toEmail}
              </span>
            </div>
          </div>

          {editing ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-5 py-2">
                <label htmlFor="assistant-subject" className="text-[11.5px] font-semibold text-fg">
                  Onderwerp
                </label>
                <input
                  id="assistant-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                  className="flex-1 border-0 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-faint disabled:opacity-60"
                />
              </div>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                disabled={sending}
                rows={10}
                aria-label="Antwoord bewerken"
                className="block w-full resize-y border-0 bg-transparent px-5 py-3 text-[12.5px] leading-6 text-fg outline-none disabled:opacity-60"
              />
            </>
          ) : (
            <>
              <div className="border-b border-line px-5 py-2 text-[11.5px] text-muted">
                <span className="font-semibold text-fg">Onderwerp:</span> {subject}
              </div>
              <pre className="whitespace-pre-wrap break-words px-5 py-4 font-sans text-[12.5px] leading-6 text-fg">
                {state.body}
              </pre>
            </>
          )}

          {error && <p className="px-5 pb-1 text-[11.5px] text-neg">{error}</p>}

          {/* Weggooien links, de rest rechts. Bewust ruim uit elkaar: verzenden
              is onomkeerbaar en mag geen buurman zijn van weggooien. */}
          <div className="flex flex-wrap items-center justify-between gap-6 border-t border-line px-5 py-3">
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  setEditing(false)
                  setError(null)
                  return
                }
                discardDraft(leadId)
              }}
              disabled={sending}
              className="rounded-control px-3 py-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-[color-mix(in_oklab,var(--c-neg)_10%,transparent)] hover:text-neg disabled:opacity-50"
            >
              {editing ? 'Annuleren' : 'Weggooien'}
            </button>

            <div className="flex items-center gap-5">
              {editing ? (
                <button
                  type="button"
                  onClick={() => {
                    updateDraft(leadId, editBody)
                    setEditing(false)
                  }}
                  disabled={sending}
                  className="rounded-control border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
                >
                  Bewerking bewaren
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => beginEdit(state.body)}
                  disabled={sending}
                  className="rounded-control border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
                >
                  Bewerken
                </button>
              )}

              <button
                type="button"
                onClick={() => send(editing ? editBody : state.body)}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-control bg-[var(--brand-color)] px-5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending && (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8v4l3-3-3-3v4a8 8 0 1 0 8 8h-2a6 6 0 1 1-12 0z"
                      className="opacity-75"
                    />
                  </svg>
                )}
                {sending ? 'Wordt verzonden…' : 'Verzenden'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
