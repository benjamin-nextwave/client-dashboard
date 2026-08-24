'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { checkReferralEmail, REJECTION_TEXT } from '@/lib/lead-inbox/referral'
import { sendReferralOutreach } from '../_lib/referral-actions'

export interface ReferralDraft {
  toEmail: string
  fromEmail: string
  subject: string
  body: string
  referredName: string | null
  referredRole: string | null
  /** Naam van degene die doorverwees, uit de mailtekst gehaald. */
  referrerName: string | null
  source: 'nextwave' | 'mail' | null
  /** Waar de inhoud van de mail vandaan komt. */
  pitchSource: 'mail1' | 'thread'
  pitchLabel: string | null
}

/**
 * Overlay, en bewust geen paneel in de pagina: dit is géén antwoord in de
 * lopende thread maar een nieuwe mail aan iemand anders. Dat verschil moet je
 * zien voor je op Verzenden drukt.
 */
export function ReferralModal({
  leadId,
  leadEmail,
  leadName,
  draft,
  pending: composing,
  composeError,
  fallback,
  onClose,
  onSent,
}: {
  leadId: string
  leadEmail: string
  leadName: string | null
  /** Leeg zolang de assistent nog schrijft. */
  draft: ReferralDraft | null
  pending: boolean
  composeError: string | null
  /** Wat al bekend is uit de ontleedstap, om de kop meteen te kunnen vullen. */
  fallback: { toEmail: string; fromEmail: string; referredName: string | null }
  onClose: () => void
  onSent: () => void
}) {
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [toEmail, setToEmail] = useState(fallback.toEmail)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Het overlay gaat meteen open, de tekst komt later binnen. Alleen de eerste
  // keer overnemen, anders overschrijft een herrender wat de gebruiker typt.
  const filled = useRef(false)
  useEffect(() => {
    if (!draft || filled.current) return
    filled.current = true
    setToEmail(draft.toEmail)
    setSubject(draft.subject)
    setBody(draft.body)
  }, [draft])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, pending])

  const referredName = draft?.referredName ?? fallback.referredName

  const check = checkReferralEmail(toEmail, {
    leadEmail,
    sendingAccount: fallback.fromEmail,
  })
  const canSend =
    !composing && check.ok && subject.trim().length > 0 && body.trim().length > 0

  function send() {
    if (!check.ok) {
      setError(REJECTION_TEXT[check.reason])
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await sendReferralOutreach({
        leadId,
        toEmail: check.email,
        subject: subject.trim(),
        body: body.trim(),
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      onSent()
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !pending && onClose()}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Doorverwijzing benaderen"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[720px] flex-col overflow-hidden rounded-panel border border-line bg-panel"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-[var(--brand-06)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.015em]">
              Doorverwijzing benaderen
            </h2>
            <p className="mt-1 text-[12.5px] leading-[1.5] text-muted">
              Dit is een <strong className="font-semibold text-fg">nieuwe mail</strong> aan{' '}
              {referredName ? (
                <strong className="font-semibold text-fg">{referredName}</strong>
              ) : (
                'de doorverwezen persoon'
              )}
              {draft?.referredRole ? ` (${draft.referredRole})` : ''} — geen antwoord aan{' '}
              {draft?.referrerName || leadName || leadEmail}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="Sluiten"
            className="shrink-0 rounded-control p-1.5 text-faint transition-colors hover:bg-[var(--brand-08)] hover:text-fg disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Adressen */}
          <div className="border-b border-line px-5 py-3 text-[11.5px]">
            <div className="flex items-baseline gap-2">
              <span className="w-[78px] shrink-0 font-semibold text-fg">Van</span>
              <span className="min-w-0 truncate text-muted">{fallback.fromEmail}</span>
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="w-[78px] shrink-0 font-semibold text-fg">Aan</span>
              {editing ? (
                <input
                  type="email"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  disabled={pending}
                  aria-label="E-mailadres van de doorverwezen persoon"
                  className="min-w-0 flex-1 rounded-control border border-line bg-canvas px-2 py-1 text-[12.5px] outline-none transition-colors focus:border-[var(--brand-color)] disabled:opacity-60"
                />
              ) : (
                <span className="min-w-0 truncate font-semibold text-fg">{toEmail}</span>
              )}
              {draft?.source && !editing && (
                <span className="shrink-0 rounded-[5px] bg-track px-1.5 py-0.5 text-[10px] font-medium text-muted">
                  {draft.source === 'nextwave' ? 'door NextWave opgezocht' : 'uit de reactie'}
                </span>
              )}
            </div>
            {!check.ok && (
              <p className="mt-1.5 pl-[86px] text-[11.5px] text-neg">
                {REJECTION_TEXT[check.reason]}
              </p>
            )}
          </div>

          {/* Onderwerp */}
          <div className="flex items-center gap-2 border-b border-line px-5 py-2">
            <label
              htmlFor="referral-subject"
              className="w-[78px] shrink-0 text-[11.5px] font-semibold text-fg"
            >
              Onderwerp
            </label>
            <input
              id="referral-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={pending}
              placeholder="Onderwerp van de mail"
              className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-faint disabled:opacity-60"
            />
          </div>

          {/* Waar de inhoud vandaan komt. Bij een reactie op een herinnering
              staat er in de thread geen pitch; dan is dit de waarschuwing om
              de tekst extra na te lezen. */}
          {draft && (
            <div
              className={`border-b border-line px-5 py-2 text-[11px] ${
                draft.pitchSource === 'mail1'
                  ? 'text-muted'
                  : 'bg-[color-mix(in_oklab,var(--c-warn)_9%,transparent)] text-warn'
              }`}
            >
              {draft.pitchSource === 'mail1' ? (
                <>
                  Inhoud gebaseerd op de campagnemail
                  {draft.pitchLabel ? ` — ${draft.pitchLabel}` : ''}.
                </>
              ) : (
                <>
                  Er staat geen campagnemail klaar bij Mailvarianten, dus de inhoud komt uit
                  het mailverkeer met {draft.referrerName || leadName || leadEmail}. Lees hem
                  extra goed na.
                </>
              )}
            </div>
          )}

          {/* Bericht */}
          {composing ? (
            <>
              <ProgressBar />
              <TypingPlaceholder />
            </>
          ) : composeError ? (
            <p className="px-5 py-6 text-[12.5px] text-neg">{composeError}</p>
          ) : editing ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={pending}
              rows={14}
              aria-label="Bericht bewerken"
              className="block w-full resize-y border-0 bg-transparent px-5 py-4 text-[12.5px] leading-6 text-fg outline-none disabled:opacity-60"
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words px-5 py-4 font-sans text-[12.5px] leading-6 text-fg">
              {body}
            </pre>
          )}
        </div>

        {error && (
          <p className="shrink-0 border-t border-line bg-[color-mix(in_oklab,var(--c-neg)_8%,transparent)] px-5 py-2.5 text-[11.5px] text-neg">
            {error}
          </p>
        )}

        {/* Weggooien links, verzenden rechts en ver ervandaan. */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-6 border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-control px-3 py-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-[color-mix(in_oklab,var(--c-neg)_10%,transparent)] hover:text-neg disabled:opacity-50"
          >
            Weggooien
          </button>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              disabled={pending}
              className="rounded-control border border-line bg-panel px-3.5 py-2 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
            >
              {editing ? 'Klaar met bewerken' : 'Bewerken'}
            </button>
            <button
              type="button"
              onClick={send}
              disabled={pending || !canSend}
              className="inline-flex items-center gap-2 rounded-control bg-[var(--brand-color)] px-5 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
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
      </div>
    </div>
  )
}

/**
 * Wat je ziet terwijl de assistent schrijft. Regels die na elkaar verschijnen
 * met een knipperende cursor erachter — de wachttijd is een paar seconden en
 * dat voelt korter als er iets gebeurt dan als er een balkje draait.
 */
function TypingPlaceholder() {
  // Wisselende breedtes, anders leest het als een blokkendoos in plaats van
  // als tekst.
  const lines = [92, 78, 96, 64, 0, 88, 71, 45]

  return (
    <div className="px-5 py-4" aria-live="polite" aria-busy="true">
      <span className="sr-only">De assistent schrijft de mail.</span>
      <div className="flex flex-col gap-2.5">
        {lines.map((width, i) =>
          width === 0 ? (
            <div key={i} className="h-1" />
          ) : (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="h-[9px] animate-pulse rounded-full bg-track"
                style={{ width: `${width}%`, animationDelay: `${i * 140}ms` }}
              />
              {i === lines.length - 1 && (
                <span
                  aria-hidden
                  className="h-[13px] w-[2px] animate-pulse bg-[var(--brand-color)]"
                  style={{ animationDuration: '900ms' }}
                />
              )}
            </div>
          )
        )}
      </div>
      <p className="mt-4 text-[11.5px] text-muted">De assistent schrijft de mail…</p>
    </div>
  )
}

/**
 * Voortgangsbalk zonder percentage. Hoe lang het model erover doet is vooraf
 * niet te zeggen, dus een echte teller zou een verzinsel zijn; deze laat
 * alleen zien dat er gewerkt wordt.
 */
function ProgressBar() {
  return (
    <div
      role="progressbar"
      aria-label="De mail wordt opgesteld"
      className="relative h-[3px] w-full overflow-hidden bg-track"
    >
      <div
        className="absolute inset-y-0 bg-[var(--brand-color)]"
        style={{ animation: 'nwIndeterminate 1.5s ease-in-out infinite' }}
      />
    </div>
  )
}
