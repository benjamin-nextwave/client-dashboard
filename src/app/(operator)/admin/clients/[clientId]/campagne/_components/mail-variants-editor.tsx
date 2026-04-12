'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MailVariant } from '@/lib/data/campaign'
import {
  addMailVariant,
  updateMailVariant,
  deleteMailVariant,
  setMailVariantPublished,
  requestVariantsApproval,
  mailClientAboutVariants,
} from '../actions'

interface Props {
  clientId: string
  variants: MailVariant[]
  variantsApprovalRequestedAt: string | null
}

const MAILS: Array<{ number: 1 | 2 | 3; title: string; description: string }> = [
  { number: 1, title: 'Mail 1', description: 'Eerste contact' },
  { number: 2, title: 'Mail 2', description: 'Follow-up' },
  { number: 3, title: 'Mail 3', description: 'Laatste poging' },
]

export function MailVariantsEditor({ clientId, variants, variantsApprovalRequestedAt }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mailStatus, setMailStatus] = useState<'idle' | 'sent'>('idle')

  const alreadyPublished = !!variantsApprovalRequestedAt
  const allPublished = variants.length > 0 && variants.every((v) => v.isPublished)
  const hasHidden = variants.some((v) => !v.isPublished)

  const handleAdd = (mailNumber: 1 | 2 | 3) => {
    setError(null)
    startTransition(async () => {
      const result = await addMailVariant(clientId, mailNumber)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handlePublish = () => {
    setError(null)
    startTransition(async () => {
      const result = await requestVariantsApproval(clientId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleMailClient = () => {
    setError(null)
    setMailStatus('idle')
    startTransition(async () => {
      const result = await mailClientAboutVariants(clientId)
      if (result.error) {
        setError(result.error)
      } else {
        setMailStatus('sent')
        setTimeout(() => setMailStatus('idle'), 3000)
      }
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h2 className="text-sm font-semibold text-gray-900">Mailvarianten</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Voeg varianten toe per mail als aanvulling op de PDF. Gebruik de knoppen hieronder om
          ze zichtbaar te maken in het klantdashboard en de klant te notificeren.
        </p>

        {/* Action buttons row */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={pending || variants.length === 0 || (alreadyPublished && allPublished)}
            className={`group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              alreadyPublished && allPublished
                ? 'cursor-not-allowed bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-gray-900 text-white shadow-sm hover:bg-indigo-600 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60'
            }`}
          >
            {alreadyPublished && allPublished ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Alle varianten zichtbaar
              </>
            ) : hasHidden && alreadyPublished ? (
              <>
                Publiceer alle verborgen varianten
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            ) : (
              <>
                Voeg alle mailvarianten toe aan klantendashboard
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleMailClient}
            disabled={pending}
            className="group inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100 hover:shadow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {mailStatus === 'sent' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Mail verstuurd
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Mail de klant
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {MAILS.map((mail) => {
          const mailVariants = variants.filter((v) => v.mailNumber === mail.number)
          return (
            <div key={mail.number} className="rounded-xl border border-gray-200 bg-gray-50/30 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{mail.title}</h3>
                    <span className="text-xs text-gray-400">· {mail.description}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {mailVariants.length} {mailVariants.length === 1 ? 'variant' : 'varianten'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdd(mail.number)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-50"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Variant toevoegen
                </button>
              </div>

              {mailVariants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-400">
                  Nog geen varianten voor deze mail
                </div>
              ) : (
                <div className="space-y-2">
                  {mailVariants.map((variant) => (
                    <VariantCard
                      key={variant.id}
                      variant={variant}
                      clientId={clientId}
                      expanded={expandedId === variant.id}
                      onToggle={() => setExpandedId(expandedId === variant.id ? null : variant.id)}
                      disabled={pending}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function VariantCard({
  variant,
  clientId,
  expanded,
  onToggle,
  disabled,
}: {
  variant: MailVariant
  clientId: string
  expanded: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  const router = useRouter()
  const [saving, startSave] = useTransition()
  const [label, setLabel] = useState(variant.variantLabel)
  const [subject, setSubject] = useState(variant.subject)
  const [body, setBody] = useState(variant.body)
  const [explanation, setExplanation] = useState(variant.explanation)
  const [saved, setSaved] = useState(false)

  const isDirty =
    label !== variant.variantLabel ||
    subject !== variant.subject ||
    body !== variant.body ||
    explanation !== variant.explanation

  const handleSave = () => {
    startSave(async () => {
      const result = await updateMailVariant(variant.id, clientId, {
        variantLabel: label,
        subject,
        body,
        explanation,
      })
      if (!result.error) {
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`Verwijder ${variant.variantLabel}?`)) return
    startSave(async () => {
      const result = await deleteMailVariant(variant.id, clientId)
      if (!result.error) router.refresh()
    })
  }

  const [togglingPublish, startTogglePublish] = useTransition()

  const handleTogglePublish = () => {
    startTogglePublish(async () => {
      const result = await setMailVariantPublished(variant.id, clientId, !variant.isPublished)
      if (!result.error) router.refresh()
    })
  }

  // Auto-save before collapsing if dirty (so typed changes never get lost)
  const handleToggle = () => {
    if (expanded && isDirty) {
      handleSave()
    }
    onToggle()
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border shadow-sm ${
        isDirty ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200 bg-white'
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${
              isDirty ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            {variant.variantLabel.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="truncate text-sm font-semibold text-gray-900">{label}</div>
              {variant.isPublished ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  Zichtbaar voor klant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                  <span className="h-1 w-1 rounded-full bg-gray-400" />
                  Verborgen
                </span>
              )}
              {isDirty && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                  Onopgeslagen
                </span>
              )}
            </div>
            <div className="truncate text-xs text-gray-500">{subject || 'Geen onderwerp'}</div>
          </div>
        </div>
        <svg className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 bg-gray-50/30 p-4">
          {/* Publish toggle — prominent, at the top of the expanded card */}
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={togglingPublish}
            className={`group flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all disabled:opacity-60 ${
              variant.isPublished
                ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                : 'border-dashed border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  variant.isPublished ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {variant.isPublished ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </div>
              <div>
                <div className={`text-sm font-semibold ${variant.isPublished ? 'text-emerald-900' : 'text-gray-900'}`}>
                  {variant.isPublished
                    ? 'Zichtbaar in klantendashboard'
                    : 'Niet zichtbaar in klantendashboard'}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  {variant.isPublished
                    ? 'Klik om te verbergen — de variant blijft hier bewaard.'
                    : 'Klik om toe te voegen aan het klantendashboard.'}
                </div>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${
                variant.isPublished
                  ? 'bg-white text-gray-700 ring-1 ring-gray-200 group-hover:bg-gray-50'
                  : 'bg-indigo-600 text-white shadow-sm group-hover:bg-indigo-700'
              }`}
            >
              {variant.isPublished ? 'Haal weg' : 'Toevoegen'}
            </span>
          </button>

          <FieldLabel text="Label">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={disabled || saving}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </FieldLabel>
          <FieldLabel text="Onderwerp">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Bv. Samen {{company}} laten groeien"
              disabled={disabled || saving}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </FieldLabel>
          <FieldLabel text="Mail body">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Schrijf hier de mail body..."
              disabled={disabled || saving}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </FieldLabel>
          <FieldLabel text="Toelichting voor de klant">
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
              placeholder="Waarom deze variant? Hoe gebruiken?"
              disabled={disabled || saving}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </FieldLabel>
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || saving}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Verwijderen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || saving || !isDirty}
              className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-bold shadow-sm transition-all ${
                isDirty && !saving
                  ? 'bg-amber-500 text-white shadow-amber-500/30 hover:-translate-y-0.5 hover:bg-amber-600 hover:shadow-md'
                  : 'bg-gray-200 text-gray-400'
              } disabled:cursor-not-allowed`}
            >
              {saved ? (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Opgeslagen
                </>
              ) : isDirty ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 9 17.25 19.5 6.75" />
                  </svg>
                  Opslaan
                </>
              ) : (
                'Opgeslagen'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FieldLabel({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {text}
      </label>
      {children}
    </div>
  )
}
