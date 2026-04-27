'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'
import {
  LABEL_META,
  LEAD_LABELS,
  type CampaignLead,
  type LeadLabel,
} from '@/lib/data/campaign-leads'
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
  const [modalOpen, setModalOpen] = useState(false)

  // Reeds ingediend (in behandeling of beoordeeld)? Toon historie en sluit
  // alle verdere indien-acties uit — er kan slechts één bezwaar per lead.
  if (status) {
    return <ObjectionHistory lead={lead} />
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        Bezwaar indienen
      </button>

      {modalOpen && (
        <ObjectionModal
          lead={lead}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

function ObjectionHistory({ lead }: { lead: CampaignLead }) {
  const status = lead.objectionStatus
  if (!status) return null

  const proposedMeta = lead.objectionProposedLabel
    ? LABEL_META[lead.objectionProposedLabel]
    : null

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        Bezwaar
      </p>

      {proposedMeta && (
        <div className="mb-3 rounded-md border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-medium text-gray-500">Voorgesteld label</p>
          <span
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${proposedMeta.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${proposedMeta.dot}`} />
            {proposedMeta.short}
          </span>
          {lead.objectionProposedLabelNote && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
              {lead.objectionProposedLabelNote}
            </p>
          )}
        </div>
      )}

      {lead.objectionText && (
        <details className="mb-3 rounded-md border border-gray-100 bg-gray-50 p-3">
          <summary className="cursor-pointer text-[11px] font-medium text-gray-500 hover:text-gray-700">
            Bekijk je gesprek met de beoordelaar
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{lead.objectionText}</p>
          {lead.objectionSubmittedAt && (
            <p className="mt-2 text-[11px] text-gray-400">
              Ingediend op {DATE_ONLY_FMT.format(new Date(lead.objectionSubmittedAt))}
            </p>
          )}
        </details>
      )}

      {status === 'pending' ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Je bezwaar wordt momenteel beoordeeld door het Nextwave team.
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

// ─── Bezwaar-modal (3 stappen) ─────────────────────────────────────────

type ModalStep = 'consent' | 'chat' | 'classify'

function ObjectionModal({
  lead,
  onClose,
}: {
  lead: CampaignLead
  onClose: () => void
}) {
  const [step, setStep] = useState<ModalStep>('consent')
  // Hef de transcript op uit de chat zodat de classify-stap hem mee kan sturen.
  const [transcript, setTranscript] = useState<string>('')

  // ESC sluit modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'consent' && (
          <ConsentStep
            onCancel={onClose}
            onContinue={() => setStep('chat')}
          />
        )}
        {step === 'chat' && (
          <ChatStep
            lead={lead}
            onClose={onClose}
            onContinue={(t) => {
              setTranscript(t)
              setStep('classify')
            }}
          />
        )}
        {step === 'classify' && (
          <ClassifyStep
            lead={lead}
            transcript={transcript}
            onBack={() => setStep('chat')}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

// ─── Stap 1: Consent ──────────────────────────────────────────────────

function ConsentStep({
  onCancel,
  onContinue,
}: {
  onCancel: () => void
  onContinue: () => void
}) {
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">
            Voor je begint
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            <span className="font-semibold">De inhoud van dit gesprek wordt gedeeld met het Nextwave team voor de beoordeling van het bezwaar.</span>{' '}
            Je start nu een gesprek met een AI beoordelaar. Hij of zij stelt je een aantal vragen en
            geeft een eerlijke voorspelling van hoe het bezwaar bekeken wordt.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Je gesprek wordt volledig opgeslagen en is leesbaar voor onze beoordelaars.
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Per lead kan slechts één bezwaar worden ingediend.
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              De AI beoordelaar geeft een inschatting, geen definitief oordeel — die ligt bij het
              Nextwave team.
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
        >
          Annuleren
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          Doorgaan naar gesprek
        </button>
      </div>
    </div>
  )
}

// ─── Stap 2: Chat ─────────────────────────────────────────────────────

function ChatStep({
  lead,
  onClose,
  onContinue,
}: {
  lead: CampaignLead
  onClose: () => void
  onContinue: (transcript: string) => void
}) {
  const [input, setInput] = useState('')
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  const userTurns = messages.filter((m) => m.role === 'user').length
  const canContinue = userTurns >= MIN_USER_TURNS && !isStreaming

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || isStreaming) return
    sendMessage({ text: trimmed })
    setInput('')
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Gesprek met beoordelaar</h2>
            <p className="text-[11px] text-gray-500">
              Stap 1 van 2 · {Math.min(userTurns, MIN_USER_TURNS)}/{MIN_USER_TURNS} berichten verstuurd
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Sluiten"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[55vh] min-h-[280px] space-y-3 overflow-y-auto bg-gray-50/40 p-5">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-200 bg-white p-3 text-center text-xs text-gray-500">
            Begin met je bezwaar in een paar zinnen — de beoordelaar zal je vragen stellen.
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-3">
        {canContinue ? (
          <>
            <p className="text-xs text-gray-600">
              Klaar met praten? Ga door naar de laatste stap om je bezwaar in te dienen.
            </p>
            <button
              type="button"
              onClick={() => onContinue(formatTranscript(messages))}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              Doorgaan naar bezwaar indienen
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            Stuur eerst minimaal {MIN_USER_TURNS} berichten met de beoordelaar
            {userTurns > 0 ? ` (${userTurns}/${MIN_USER_TURNS})` : ''}.
          </p>
        )}
      </div>
    </>
  )
}

// ─── Stap 3: Classificatie + toelichting ──────────────────────────────

function ClassifyStep({
  lead,
  transcript,
  onBack,
  onClose,
}: {
  lead: CampaignLead
  transcript: string
  onBack: () => void
  onClose: () => void
}) {
  const router = useRouter()
  const [proposedLabel, setProposedLabel] = useState<LeadLabel | ''>('')
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const labelOptions: LeadLabel[] = LEAD_LABELS.filter((l) => l !== lead.label)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!proposedLabel) {
      setError('Kies een label dat volgens jou wel past.')
      return
    }
    if (note.trim().length < 10) {
      setError('Geef minimaal 10 tekens toelichting bij je voorgestelde label.')
      return
    }
    if (transcript.trim().length < 10) {
      setError('Het gesprek lijkt leeg. Ga terug en probeer opnieuw.')
      return
    }
    startTransition(async () => {
      const result = await submitLeadObjection({
        leadId: lead.id,
        text: transcript,
        proposedLabel,
        proposedLabelNote: note.trim(),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  const currentMeta = LABEL_META[lead.label]

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 9 7.5l4.5 4.5L21.75 3" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Voorgesteld label kiezen</h2>
            <p className="text-[11px] text-gray-500">Stap 2 van 2 · Definitief indienen</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Sluiten"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-5">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Huidig label
          </p>
          <span
            className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${currentMeta.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${currentMeta.dot}`} />
            {currentMeta.short}
          </span>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-gray-900">
            Welk label past volgens jou wél?
          </legend>
          <p className="mt-1 text-xs text-gray-500">Kies één optie.</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {labelOptions.map((labelKey) => {
              const meta = LABEL_META[labelKey]
              const checked = proposedLabel === labelKey
              return (
                <label
                  key={labelKey}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                    checked
                      ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="proposedLabel"
                    value={labelKey}
                    checked={checked}
                    onChange={() => setProposedLabel(labelKey)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-rose-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      <span className="text-sm font-medium text-gray-900">{meta.name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>

        <div className="mt-5">
          <label htmlFor="proposedNote" className="text-sm font-semibold text-gray-900">
            Toelichting <span className="text-red-500">*</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Leg in een paar zinnen uit waarom dit label volgens jou beter past dan het huidige.
          </p>
          <textarea
            id="proposedNote"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            minLength={10}
            maxLength={2000}
            required
            placeholder="Bijvoorbeeld: de lead vraagt expliciet om telefonisch contact, niet om een meeting…"
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            {note.trim().length}/2000 tekens
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
        >
          ← Terug naar gesprek
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={pending || !proposedLabel || note.trim().length < 10}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? 'Indienen…' : 'Bezwaar definitief indienen'}
          </button>
        </div>
      </div>
    </form>
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
      const speaker = m.role === 'user' ? 'Klant' : 'Beoordelaar'
      return `${speaker}: ${text.trim()}`
    })
    .filter((line) => line.length > `Klant: `.length)
    .join('\n\n')
}
