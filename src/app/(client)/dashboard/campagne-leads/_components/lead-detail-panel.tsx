'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LABEL_META, type CampaignLead } from '@/lib/data/campaign-leads'
import { generateLabelJustification } from '@/lib/actions/campaign-leads-actions'
import { useT } from '@/lib/i18n/client'
import { AdminContactBox, hasAdminContactBox } from '@/components/admin-contact-box'
import { LABEL_DOT, OBJECTION_COLOR } from './lead-meta'
import { ObjectionModal } from './objection-modal'

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const DATETIME_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function initials(value: string) {
  return value
    .split(/[\s@.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">
      {children}
    </div>
  )
}

interface Props {
  lead: CampaignLead
  position: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export function LeadDetailPanel({ lead, position, total, onPrev, onNext }: Props) {
  const t = useT()
  const [objectionOpen, setObjectionOpen] = useState(false)
  const [sentOpen, setSentOpen] = useState(false)

  const objectionColor = lead.objectionStatus ? OBJECTION_COLOR[lead.objectionStatus] : null
  const objectionLabel = lead.objectionStatus
    ? lead.objectionStatus === 'pending'
      ? t('leads.objectionPending')
      : lead.objectionStatus === 'approved'
        ? t('leads.objectionApproved')
        : t('leads.objectionRejected')
    : null
  const hasReferral = hasAdminContactBox(lead.adminContact)

  return (
    <aside className="flex w-[392px] shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-panel">
      {/* Identiteit */}
      <div className="shrink-0 border-b border-line px-[18px] py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--brand-12)] text-[13px] font-semibold text-brand-ink">
            {initials(lead.leadName || lead.leadEmail)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.02em]">
              {lead.leadName || lead.leadEmail}
            </h2>
            <div className="mt-[3px] truncate text-[11.5px] text-faint">{lead.leadEmail}</div>
            <div className="mt-0.5 text-[11.5px] text-faint">
              {lead.leadCompany ? `${lead.leadCompany} · ` : ''}
              {DATE_FMT.format(new Date(lead.receivedAt))}
            </div>
          </div>
        </div>

        {/* Geteld als + bezwaar — de beslissing en de correctie naast elkaar */}
        <div className="mt-3.5 rounded-[9px] border border-line bg-track px-3 py-[11px]">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <SectionLabel>{t('leads.countedAs')}</SectionLabel>
              <div className="mt-[5px] flex items-center gap-[7px]">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: LABEL_DOT[lead.label] }}
                  aria-hidden
                />
                <span className="truncate text-[13px] font-semibold">
                  {LABEL_META[lead.label].name}
                </span>
              </div>
            </div>

            {objectionColor && objectionLabel ? (
              <span
                className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold"
                style={{
                  color: objectionColor,
                  background: `color-mix(in oklab, ${objectionColor} 12%, transparent)`,
                }}
              >
                {objectionLabel}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setObjectionOpen(true)}
                className="flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] border border-line bg-panel px-2.5 text-[11.5px] font-semibold transition-colors hover:bg-[var(--brand-08)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px] text-warn" aria-hidden>
                  <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
                {t('leads.submitObjection')}
              </button>
            )}
          </div>

          {lead.objectionResponse && (
            <p className="mt-2.5 border-t border-line pt-2.5 text-[12px] leading-[1.55] text-muted">
              {lead.objectionResponse}
            </p>
          )}
        </div>
      </div>

      {/* Inhoud */}
      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-[18px] py-4">
        {hasReferral && lead.adminContact && <AdminContactBox data={lead.adminContact} />}

        {/* De reactie — de reden dat deze lead telt, dus prominent */}
        {(lead.replySubject || lead.replyBody) && (
          <div>
            <div className="mb-[7px] flex items-center justify-between">
              <SectionLabel>{t('leads.replyFromLead')}</SectionLabel>
              <span className="text-[11px] tabular-nums text-faint">
                {DATETIME_FMT.format(new Date(lead.receivedAt))}
              </span>
            </div>
            <div className="rounded-[9px] border border-line border-l-2 border-l-brand bg-[var(--brand-04)] px-[13px] py-3">
              {lead.replySubject && (
                <div className="text-[12.5px] font-semibold">{lead.replySubject}</div>
              )}
              {lead.replyBody && (
                <p className="mt-[7px] whitespace-pre-line text-[12.5px] leading-[1.6] text-muted">
                  {lead.replyBody}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Ons eigen bericht — context, dus standaard ingeklapt */}
        {(lead.sentSubject || lead.sentBody) && (
          <div>
            <button
              type="button"
              onClick={() => setSentOpen((v) => !v)}
              aria-expanded={sentOpen}
              className="flex w-full items-center gap-[9px] rounded-[9px] border border-line px-3 py-2.5 text-left transition-colors hover:bg-[var(--brand-05)]"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-3 w-3 shrink-0 text-faint transition-transform ${sentOpen ? 'rotate-90' : ''}`}
                aria-hidden
              >
                <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              <span className="shrink-0 text-xs font-semibold">{t('leads.ourMessage')}</span>
              <span className="flex-1 truncate text-[11.5px] text-faint">
                {lead.sentSubject ?? '—'}
                {lead.sentAt ? ` · ${DATE_FMT.format(new Date(lead.sentAt))}` : ''}
              </span>
            </button>
            {sentOpen && lead.sentBody && (
              <p className="mt-2 whitespace-pre-line rounded-[9px] border border-line px-[13px] py-3 text-[12.5px] leading-[1.6] text-muted">
                {lead.sentBody}
              </p>
            )}
          </div>
        )}

        <JustificationSection lead={lead} />

        {lead.notes && (
          <div>
            <div className="mb-[7px]">
              <SectionLabel>{t('leads.noteFrom')}</SectionLabel>
            </div>
            <div className="rounded-[9px] border border-line border-l-2 border-l-[var(--c-note)] bg-[color-mix(in_oklab,var(--c-note)_7%,var(--color-panel))] px-[13px] py-3">
              <p className="whitespace-pre-line text-[12.5px] leading-[1.55]">{lead.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Voettekst */}
      <div className="flex shrink-0 items-center gap-[9px] border-t border-line px-[18px] py-3">
        <Link
          href={`/dashboard/lead-inbox/${lead.id}`}
          className="flex h-[34px] flex-1 items-center justify-center gap-[7px] rounded-control bg-brand text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
          </svg>
          {t('leads.openInLeadInbox')}
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={position <= 1}
            title={t('leads.prevLead')}
            aria-label={t('leads.prevLead')}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)] disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={position >= total}
            title={t('leads.nextLead')}
            aria-label={t('leads.nextLead')}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)] disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>

      {objectionOpen && <ObjectionModal lead={lead} onClose={() => setObjectionOpen(false)} />}
    </aside>
  )
}

/**
 * Onderbouwing van de categorie. Het ontwerp toonde alleen bestaande tekst,
 * maar in de oude kaart kon de klant er ook één laten opstellen — die knop
 * hoort te blijven, anders verdwijnt een werkende functie.
 */
function JustificationSection({ lead }: { lead: CampaignLead }) {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Optimistische state: zodra de AI antwoordt tonen we 'm direct, ook voordat
  // de revalidatie heeft plaatsgevonden.
  const [optimistic, setOptimistic] = useState<string | null>(null)
  const text = optimistic ?? lead.labelJustification

  function handleClick() {
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
    <div>
      <div className="mb-[7px]">
        <SectionLabel>{t('leads.whyCategory')}</SectionLabel>
      </div>
      {text ? (
        <div className="rounded-[9px] border border-line px-[13px] py-3">
          <p className="whitespace-pre-line text-[12.5px] leading-[1.6] text-muted">{text}</p>
          <div className="mt-2 text-[11px] text-faint">{t('leads.justificationBy')}</div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={handleClick}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-control border border-line bg-panel px-3 py-1.5 text-[11.5px] font-semibold transition-colors hover:bg-[var(--brand-08)] disabled:opacity-60"
          >
            <svg className="h-3.5 w-3.5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            {pending ? t('leads.aiJustificationLoading') : t('leads.aiJustificationButton')}
          </button>
          {error && <p className="mt-2 text-[11.5px] text-neg">{error}</p>}
        </div>
      )}
    </div>
  )
}
