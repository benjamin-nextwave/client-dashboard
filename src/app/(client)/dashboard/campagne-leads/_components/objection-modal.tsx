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
import { submitLeadObjection } from '@/lib/actions/campaign-leads-actions'
import { useT } from '@/lib/i18n/client'

// Hoeveel echte berichten van de klant minimaal moeten zijn gestuurd voordat
// de definitief-indienen knop verschijnt. De AI duwt door — de klant moet
// op zijn minst een paar keer expliciet hebben volgehouden.
const MIN_USER_TURNS = 3

// ─── Bezwaar-modal (3 stappen) ─────────────────────────────────────────

type ModalStep = 'consent' | 'chat' | 'classify'

export function ObjectionModal({
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
  const t = useT()
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
            {t('inbox.objectionConsentIntro')}
          </h2>

          <ul className="mt-4 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {t('inbox.objectionConsentItem1')}
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {t('inbox.objectionConsentItem2')}
            </li>
            <li className="flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              {t('inbox.objectionConsentItem3')}
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
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          {t('inbox.objectionContinueChat')}
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
  const t = useT()
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
            <h2 className="text-sm font-semibold text-gray-900">{t('leads.objectionStep2Title')}</h2>
            <p className="text-[11px] text-gray-500">
              {t('inbox.objectionFlowStep', { current: 1, total: 2 })} · {Math.min(userTurns, MIN_USER_TURNS)}/{MIN_USER_TURNS}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[55vh] min-h-[280px] space-y-3 overflow-y-auto bg-gray-50/40 p-5">
        {messages.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-200 bg-white p-3 text-center text-xs text-gray-500">
            {t('inbox.objectionAiInitial')}
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
            {t('chat.error')}
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
            placeholder={t('leads.objectionChatPlaceholder')}
            disabled={isStreaming}
            maxLength={1000}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            aria-label={t('chat.sendButton')}
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
              {t('inbox.objectionContinueClassify')}
            </p>
            <button
              type="button"
              onClick={() => onContinue(formatTranscript(messages))}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              {t('inbox.objectionContinueClassify')}
            </button>
          </>
        ) : (
          <p className="text-xs text-gray-500">
            {t('leads.objectionChatMinTurns', { n: MIN_USER_TURNS })}
            {userTurns > 0 ? ` (${userTurns}/${MIN_USER_TURNS})` : ''}
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
  const t = useT()
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
      setError(t('leads.objectionPickLabel'))
      return
    }
    if (note.trim().length < 10) {
      setError(t('leads.objectionExplanationPlaceholder'))
      return
    }
    if (transcript.trim().length < 10) {
      setError(t('common.error'))
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
            <h2 className="text-sm font-semibold text-gray-900">{t('leads.objectionToClassify')}</h2>
            <p className="text-[11px] text-gray-500">{t('inbox.objectionFlowStep', { current: 2, total: 2 })}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={t('common.close')}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[60vh] overflow-y-auto p-5">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {t('leads.objectionPickLabel')}
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
            {t('leads.objectionPickLabel')}
          </legend>
          <p className="mt-1 text-xs text-gray-500">{t('leads.objectionExplanationLabel')}</p>

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
            {t('leads.objectionExplanationLabel')} <span className="text-red-500">*</span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            {t('leads.objectionExplanationPlaceholder')}
          </p>
          <textarea
            id="proposedNote"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            minLength={10}
            maxLength={2000}
            required
            placeholder={t('leads.objectionExplanationPlaceholder')}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            {note.trim().length}/2000
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
          ← {t('inbox.objectionPreviousStep')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={pending || !proposedLabel || note.trim().length < 10}
            className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
          >
            {pending ? t('leads.objectionSubmitting') : t('inbox.objectionFinalSubmit')}
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
