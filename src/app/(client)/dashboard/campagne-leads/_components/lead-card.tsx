'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LABEL_META, type CampaignLead } from '@/lib/data/campaign-leads'
import {
  generateLabelJustification,
  submitLeadObjection,
} from '@/lib/actions/campaign-leads-actions'

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
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')

  const status = lead.objectionStatus

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitLeadObjection({ leadId: lead.id, text: text.trim() })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setShowForm(false)
      setText('')
      router.refresh()
    })
  }

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

  // Geen bezwaar — toon de actieknop / het formulier.
  return (
    <div className="mt-4">
      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Reden van bezwaar
          </label>
          <textarea
            rows={4}
            required
            minLength={10}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Leg uit waarom je het niet eens bent met dit label of deze lead…"
          />
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setText('')
                setError(null)
              }}
              disabled={pending}
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={pending || text.trim().length < 10}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {pending ? 'Verzenden…' : 'Bezwaar indienen'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
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
