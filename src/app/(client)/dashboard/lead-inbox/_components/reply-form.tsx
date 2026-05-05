'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { sendReply } from '../_lib/actions'

export function ReplyForm({
  leadId,
  replyToSubject,
  sendingAccount,
  toEmail,
  onSent,
  onCancel,
}: {
  leadId: string
  replyToSubject: string
  sendingAccount: string
  toEmail: string
  onSent?: () => void
  onCancel?: () => void
}) {
  const initialSubject = replyToSubject.toLowerCase().startsWith('re:')
    ? replyToSubject
    : `Re: ${replyToSubject}`

  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const trimmedSubject = subject.trim()
    if (!trimmedSubject) {
      setError('Onderwerp mag niet leeg zijn.')
      return
    }
    const trimmed = body.trim()
    if (!trimmed) {
      setError('Bericht mag niet leeg zijn.')
      return
    }
    startTransition(async () => {
      const result = await sendReply(leadId, trimmedSubject, trimmed)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setBody('')
      setSuccess(true)
      // Sluit de form na 2.5s zodat de gebruiker de bevestiging ziet.
      closeTimerRef.current = setTimeout(() => onSent?.(), 2500)
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-gray-200 bg-white"
    >
      <div className="border-b border-gray-100 px-5 py-3 text-xs text-gray-600">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>
            <span className="font-semibold text-gray-700">Van:</span> {sendingAccount}
          </span>
          <span>
            <span className="font-semibold text-gray-700">Aan:</span> {toEmail}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-2">
        <label
          htmlFor="reply-subject"
          className="text-xs font-semibold text-gray-700"
        >
          Onderwerp
        </label>
        <input
          id="reply-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={pending || success}
          className="flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
        />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending || success}
        rows={6}
        placeholder="Schrijf je antwoord…"
        className="block w-full resize-y border-0 bg-transparent px-5 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
        <div className="text-xs">
          {error && <span className="text-rose-700">{error}</span>}
          {success && !error && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.4}
                stroke="currentColor"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Reactie verzonden
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={pending || success}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              Annuleren
            </button>
          )}
        <button
          type="submit"
          disabled={pending || success || !subject.trim() || !body.trim()}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 0 1 8-8v4l3-3-3-3v4a8 8 0 1 0 8 8h-2a6 6 0 1 1-12 0z"
                className="opacity-75"
              />
            </svg>
          )}
          {pending ? 'Wordt verzonden…' : 'Verzenden'}
        </button>
        </div>
      </div>
    </form>
  )
}
