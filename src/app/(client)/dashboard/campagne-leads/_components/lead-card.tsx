'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import { LABEL_META, type CampaignLead } from '@/lib/data/campaign-leads'
import {
  generateLabelJustification,
  submitLeadObjection,
} from '@/lib/actions/campaign-leads-actions'

// Hoeveel echte berichten van de klant minimaal moeten zijn gestuurd voordat
// de definitief-indienen knop verschijnt. De AI duwt door — de klant moet
// op zijn minst een paar keer expliciet hebben volgehouden.
const MIN_USER_TURNS = 3

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

const DATE_ONLY_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function LeadCard({ lead }: { lead: CampaignLead }) {
  const [open, setOpen] = useState(false)
  const meta = LABEL_META[lead.label]

  const hasSent = lead.sentSubject || lead.sentBody
  const hasReply = lead.replySubject || lead.replyBody
  const expandable = true // Knoppen zitten altijd in het uitgeklapte deel.

  // Status-pill rechts in de header
  const objectionBadge = renderObjectionBadge(lead)

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={() => expandable && setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.short}
            </span>
            {objectionBadge}
            <span className="text-xs text-gray-400">{DATE_FMT.format(new Date(lead.receivedAt))}</span>
          </div>
          <div className="mt-2">
            <p className="truncate text-sm font-semibold text-gray-900">
              {lead.leadName ? `${lead.leadName} · ` : ''}
              <span className="font-normal text-gray-700">{lead.leadEmail}</span>
            </p>
            {lead.leadCompany && (
              <p className="mt-0.5 truncate text-xs text-gray-500">{lead.leadCompany}</p>
            )}
          </div>
          {!open && lead.replySubject && (
            <p className="mt-2 truncate text-xs italic text-gray-500">
              &ldquo;{lead.replySubject}&rdquo;
            </p>
          )}
        </div>
        <svg
          className={`mt-1 h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4">
          {(hasSent || hasReply) && (
            <div className="grid gap-4 md:grid-cols-2">
              {hasSent && (
                <ThreadBlock
                  title="Verzonden mail"
                  accent="bg-blue-100 text-blue-700"
                  date={lead.sentAt ? DATE_ONLY_FMT.format(new Date(lead.sentAt)) : null}
                  subject={lead.sentSubject}
                  body={lead.sentBody}
                />
              )}
              {hasReply && (
                <ThreadBlock
                  title="Positieve reactie"
                  accent="bg-emerald-100 text-emerald-700"
                  date={DATE_ONLY_FMT.format(new Date(lead.receivedAt))}
                  subject={lead.replySubject}
                  body={lead.replyBody}
                />
              )}
            </div>
          )}

          {lead.notes && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Notitie
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-900">{lead.notes}</p>
            </div>
          )}

          <ObjectionSection lead={lead} />
          <JustificationSection lead={lead} />
        </div>
      )}
    </article>
  )
}

function renderObjectionBadge(lead: CampaignLead) {
  if (!lead.objectionStatus) return null
  const cls =
    lead.objectionStatus === 'pending'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : lead.objectionStatus === 'approved'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-700'
  const label =
    lead.objectionStatus === 'pending'
      ? 'Bezwaar in behandeling'
      : lead.objectionStatus === 'approved'
        ? 'Bezwaar goedgekeurd'
        : 'Bezwaar afgekeurd'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}

function ThreadBlock({
  title,
  accent,
  date,
  subject,
  body,
}: {
  title: string
  accent: string
  date: string | null
  subject: string | null
  body: string | null
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${accent}`}>
          {title}
        </span>
        {date && <span className="text-[11px] text-gray-400">{date}</span>}
      </div>
      {subject && (
        <p className="mb-1.5 text-sm font-semibold text-gray-900">{subject}</p>
      )}
      {body && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{body}</p>
      )}
      {!subject && !body && (
        <p className="text-xs italic text-gray-400">Geen inhoud beschikbaar.</p>
      )}
    </div>
  )
}

// ─── AI-onderbouwing ──────────────────────────────────────────────────

function JustificationSection({ lead }: { lead: CampaignLead }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Optimistische state: zodra de AI antwoordt tonen we 'm direct, ook
  // voordat de revalidatie heeft plaatsgevonden.
  const [optimistic, setOptimistic] = useState<string | null>(null)
  const text = optimistic ?? lead.labelJustification

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await generateLabelJustification({ leadId: lead.id })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setOptimistic(result.justification)
      router.refresh()
    })
  }

  return (
    <div className="mt-4">
      {text ? (
        <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/40 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-indigo-100 text-indigo-700">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
              Waarom past dit label?
            </p>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{text}</p>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {pending ? 'Onderbouwing genereren…' : 'Waarom voldoet deze lead aan het lead label?'}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

// ─── Bezwaar-flow ──────────────────────────────────────────────────────

function ObjectionSection({ lead }: { lead: CampaignLead }) {
  const status = lead.objectionStatus
  const [showChat, setShowChat] = useState(false)

  // Reeds afgehandeld of in behandeling? Toon historie.
  if (status) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Bezwaar
        </p>
        {lead.objectionText && (
          <div className="mb-3">
            <p className="text-[11px] font-medium text-gray-500">Jouw bezwaar</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">{lead.objectionText}</p>
            {lead.objectionSubmittedAt && (
              <p className="mt-1 text-[11px] text-gray-400">
                Ingediend op {DATE_ONLY_FMT.format(new Date(lead.objectionSubmittedAt))}
              </p>
            )}
          </div>
        )}

        {status === 'pending' ? (
          <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Je bezwaar wordt momenteel beoordeeld door het team.
          </div>
        ) : (
          <div
            className={`rounded-md px-3 py-2 ${
              status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'
            }`}
          >
            <p
              className={`text-[11px] font-semibold uppercase tracking-wide ${
                status === 'approved' ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {status === 'approved' ? 'Bezwaar goedgekeurd' : 'Bezwaar afgekeurd'}
              {lead.objectionResolvedAt && (
                <span className="ml-2 font-normal text-gray-500">
                  · {DATE_ONLY_FMT.format(new Date(lead.objectionResolvedAt))}
                </span>
              )}
            </p>
            {lead.objectionResponse && (
              <p
                className={`mt-1 whitespace-pre-wrap text-sm ${
                  status === 'approved' ? 'text-emerald-900' : 'text-rose-900'
                }`}
              >
                {lead.objectionResponse}
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Geen bezwaar — toon de chat-flow.
  return (
    <div className="mt-4">
      {showChat ? (
        <ObjectionChat lead={lead} onClose={() => setShowChat(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowChat(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          Bezwaar indienen
        </button>
      )}
    </div>
  )
}

// ─── Bezwaar-chat ──────────────────────────────────────────────────────

function ObjectionChat({ lead, onClose }: { lead: CampaignLead; onClose: () => void }) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitPending, startSubmit] = useTransition()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/campaign-leads/objection-chat',
        body: { leadId: lead.id },
      }),
    [lead.id]
  )

  const { messages, sendMessage, status, error } = useChat({ transport })
  const isStreaming = status === 'streaming' || status === 'submitted'

  // Auto-scroll naar laatste bericht
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const userTurns = messages.filter((m) => m.role === 'user').length
  const canSubmit = userTurns >= MIN_USER_TURNS && !isStreaming

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    sendMessage({ text: trimmed })
    setInput('')
  }

  const handleSubmitObjection = () => {
    setSubmitError(null)
    const transcript = formatTranscript(messages)
    if (transcript.length < 10) {
      setSubmitError('Het gesprek is te kort om als bezwaar in te dienen.')
      return
    }
    startSubmit(async () => {
      const result = await submitLeadObjection({ leadId: lead.id, text: transcript })
      if ('error' in result) {
        setSubmitError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Bezwaar indienen</p>
            <p className="text-[11px] text-gray-500">
              Bespreek je bezwaar eerst met onze coach. Hierna kun je het indienen.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Sluiten"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Berichten */}
      <div className="max-h-[420px] space-y-3 overflow-y-auto bg-gray-50/40 p-4">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-200 bg-white p-3 text-center text-xs text-gray-500">
            Begin met je bezwaar in een paar zinnen — onze coach zal je vragen stellen.
          </div>
        )}
        {messages.map((m) => {
          const text =
            m.parts
              ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
              .map((p) => p.text)
              .join('') ?? ''
          const isUser = m.role === 'user'
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gray-900 text-white'
                    : 'border border-gray-200 bg-white text-gray-800'
                }`}
              >
                <div className="whitespace-pre-wrap">{text}</div>
              </div>
            </div>
          )
        })}
        {isStreaming && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            Er ging iets mis met de chat. Probeer het opnieuw.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-100 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.length === 0 ? 'Waarom denk je dat dit label niet klopt?' : 'Reageer…'}
            disabled={isStreaming}
            maxLength={1000}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label="Verzend bericht"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </form>

      {/* Submit-blok */}
      <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
        {canSubmit ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-600">
              Wil je je bezwaar nu definitief indienen? Het volledige gesprek wordt meegestuurd.
            </p>
            <button
              type="button"
              onClick={handleSubmitObjection}
              disabled={submitPending}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
            >
              {submitPending ? 'Indienen…' : 'Bezwaar definitief indienen'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            Stuur eerst minimaal {MIN_USER_TURNS} berichten met de coach
            {userTurns > 0 ? ` (${userTurns}/${MIN_USER_TURNS})` : ''} voordat je het bezwaar kunt indienen.
          </p>
        )}
        {submitError && <p className="mt-2 text-xs text-red-600">{submitError}</p>}
      </div>
    </div>
  )
}

type ChatMessage = ReturnType<typeof useChat>['messages'][number]

function formatTranscript(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      const text =
        m.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('') ?? ''
      const speaker = m.role === 'user' ? 'Klant' : 'Coach'
      return `${speaker}: ${text.trim()}`
    })
    .filter((line) => line.length > `Klant: `.length)
    .join('\n\n')
}
