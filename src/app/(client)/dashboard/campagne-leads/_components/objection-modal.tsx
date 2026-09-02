'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuroCents } from '@/lib/commissions-shared'
import type {
  ClientCommissionLead,
  CommissionCategoryOption,
} from '@/lib/data/client-commission-leads'
import { submitCommissionLeadObjection } from '@/lib/actions/commission-lead-objection-actions'
import { UNBILLED_LABEL, UNBILLED_OPTION } from '@/lib/leads/objection-options'
import { useT } from '@/lib/i18n/client'

/**
 * Bezwaar maken tegen de categorie van een lead.
 *
 * Eén scherm: kies de categorie waar de lead volgens jou in hoort, schrijf
 * erbij waarom. Er zit bewust geen model tussen — de klant weet zelf wat er in
 * het gesprek is gebeurd, en de operator wil zijn woorden lezen, niet een
 * samenvatting daarvan.
 */

const MIN_REDEN = 10

export function ObjectionModal({
  lead,
  categories,
  onClose,
}: {
  lead: ClientCommissionLead
  categories: CommissionCategoryOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [choice, setChoice] = useState<string>('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await submitCommissionLeadObjection({
        leadId: lead.id,
        choice,
        reason,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  // De categorie waar de lead nu in staat is geen geldig voorstel.
  const keuzes = categories.filter((c) => c.name !== lead.categoryName)
  const klaar = choice !== '' && reason.trim().length >= MIN_REDEN

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('leads.objectionTitle')}
    >
      <div
        className="my-8 w-full max-w-lg rounded-panel border border-line bg-panel p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-semibold text-fg">{t('leads.objectionTitle')}</h2>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-muted">
          {t('leads.objectionIntro')}
        </p>

        <dl className="mt-3 rounded-control border border-line bg-canvas p-3 text-[12.5px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{t('leads.colEmail')}</dt>
            <dd className="min-w-0 truncate text-fg">{lead.leadEmail}</dd>
          </div>
          <div className="mt-1 flex justify-between gap-3">
            <dt className="text-muted">{t('leads.objectionCurrent')}</dt>
            <dd className="text-fg">
              {lead.categoryName}
              <span className="ml-2 tabular-nums text-muted">
                {formatEuroCents(lead.amountCents)}
              </span>
            </dd>
          </div>
        </dl>

        <fieldset className="mt-4">
          <legend className="text-[11.5px] font-medium uppercase tracking-wide text-muted">
            {t('leads.objectionPickCategory')}
          </legend>

          <div className="mt-2 space-y-1">
            {keuzes.map((c) => (
              <Keuze
                key={c.id}
                value={c.id}
                checked={choice === c.id}
                onChange={setChoice}
                label={c.name}
                suffix={formatEuroCents(c.priceCents)}
              />
            ))}
            <Keuze
              value={UNBILLED_OPTION}
              checked={choice === UNBILLED_OPTION}
              onChange={setChoice}
              label={UNBILLED_LABEL}
              suffix={formatEuroCents(0)}
            />
          </div>
        </fieldset>

        <div className="mt-4">
          <label
            htmlFor="bezwaar-reden"
            className="block text-[11.5px] font-medium uppercase tracking-wide text-muted"
          >
            {t('leads.objectionReason')}
          </label>
          <textarea
            id="bezwaar-reden"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('leads.objectionReasonPlaceholder')}
            className="mt-1.5 w-full rounded-control border border-line bg-canvas px-3 py-2 text-[12.5px] text-fg outline-none focus:border-fg/30"
          />
          <p className="mt-1 text-[11.5px] text-faint">{t('leads.objectionReasonHint')}</p>
        </div>

        {error && (
          <p className="mt-3 rounded-control border border-line bg-canvas px-3 py-2 text-[12.5px] text-neg">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control border border-line px-4 py-2 text-[12.5px] font-medium text-muted hover:text-fg"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !klaar}
            className="rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-brand-ink disabled:opacity-40"
          >
            {pending ? t('leads.objectionSubmitting') : t('leads.objectionSubmit')}
          </button>
        </div>
      </div>
    </div>
  )
}

function Keuze({
  value,
  checked,
  onChange,
  label,
  suffix,
}: {
  value: string
  checked: boolean
  onChange: (v: string) => void
  label: string
  suffix: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-control border px-3 py-2 text-[12.5px] ${
        checked ? 'border-fg/30 bg-canvas text-fg' : 'border-line text-muted hover:text-fg'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <input
          type="radio"
          name="bezwaar-categorie"
          value={value}
          checked={checked}
          onChange={() => onChange(value)}
          className="h-3.5 w-3.5 shrink-0 accent-current"
        />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 tabular-nums text-faint">{suffix}</span>
    </label>
  )
}
