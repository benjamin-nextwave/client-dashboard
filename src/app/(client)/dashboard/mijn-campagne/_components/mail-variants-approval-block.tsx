'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MailVariant } from '@/lib/data/campaign'
import { MailVariantsModal } from './mail-variants-modal'
import { acknowledgeMailVariants } from '../actions'
import { useT } from '@/lib/i18n/client'

interface Props {
  variants: MailVariant[]
  pdfUrl: string | null
  pdfUploadedAt: string | null
  lastAcknowledgedAt: string | null
  isPostOnboarding: boolean
}

export function MailVariantsApprovalBlock({
  variants,
  pdfUrl,
  pdfUploadedAt,
  lastAcknowledgedAt,
  isPostOnboarding,
}: Props) {
  const t = useT()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [justApproved, setJustApproved] = useState(false)

  const hasVariants = variants.length > 0
  const hasPdf = !!pdfUrl

  if (!hasVariants && !hasPdf) return null

  const variantTimes = variants.map((v) => new Date(v.updatedAt).getTime())
  const pdfTime = pdfUploadedAt ? new Date(pdfUploadedAt).getTime() : 0
  const latestUpdate = Math.max(0, ...variantTimes, pdfTime)
  const ackTime = lastAcknowledgedAt ? new Date(lastAcknowledgedAt).getTime() : 0
  const neverAcknowledged = !lastAcknowledgedAt
  const updatedSinceAck = latestUpdate > 0 && latestUpdate > ackTime
  const needsApproval = neverAcknowledged || updatedSinceAck

  if (!needsApproval) return null

  const handleApprove = () => {
    setError(null)
    startTransition(async () => {
      const r = await acknowledgeMailVariants()
      if (r.error) {
        setError(r.error)
      } else if (isPostOnboarding) {
        setJustApproved(true)
      } else {
        router.refresh()
      }
    })
  }

  // --- Post-onboarding: bedankt-notificatie na klik ---
  if (isPostOnboarding && justApproved) {
    return (
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">{t('campaign.proposalApproved')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              {t('campaign.proposalApprovedBody')}
            </p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-emerald-300 hover:text-emerald-700"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      </section>
    )
  }

  // --- Post-onboarding: clean "new proposal" look ---
  if (isPostOnboarding) {
    return (
      <>
        <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-indigo-300/20 to-transparent blur-3xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-700 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              {t('campaign.variantsNewBadge')}
            </div>
            <h3 className="mt-3 text-lg font-bold text-gray-900">
              Nieuwe mailvarianten ter goedkeuring
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              NextWave heeft {variants.length} nieuwe {variants.length === 1 ? 'mailvariant' : 'mailvarianten'} voor
              je klaargezet. Bekijk het voorstel en laat weten of je akkoord bent.
            </p>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {hasVariants && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
                >
                  Voorstel bekijken ({variants.length})
                </button>
              )}
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    {t('campaign.proposalSending')}
                  </>
                ) : (
                  <>
                    {t('campaign.variantsApprove')}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {open && hasVariants && (
          <MailVariantsModal variants={variants} onClose={() => setOpen(false)} />
        )}
      </>
    )
  }

  // --- During onboarding: amber action card with step 4, PDF link, urgency ---
  const perMail: Record<number, number> = {}
  for (const v of variants) perMail[v.mailNumber] = (perMail[v.mailNumber] ?? 0) + 1

  let description: string
  if (hasVariants && hasPdf) {
    description = `NextWave heeft ${variants.length} ${variants.length === 1 ? 'mailvariant' : 'mailvarianten'} én een PDF-document voor je klaargezet. Bekijk alles en keur goed om de campagne op schema te houden.`
  } else if (hasVariants) {
    const mailsLabel =
      Object.keys(perMail).length > 0
        ? ` over Mail ${Object.keys(perMail).sort().join(', Mail ')}`
        : ''
    description = `NextWave heeft ${variants.length} ${variants.length === 1 ? 'mailvariant' : 'mailvarianten'}${mailsLabel} voor je klaargezet. Bekijk de inhoud en keur ze goed om de campagne op schema te houden.`
  } else {
    description =
      'NextWave heeft een PDF-document met de mailvarianten voor je klaargezet. Open en lees het document en keur goed om de campagne op schema te houden.'
  }

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-lg shadow-amber-200/40">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-white shadow-lg shadow-amber-500/30 ring-1 ring-amber-400">
            4
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">Mailvarianten goedkeuren</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              Binnen 5 werkdagen om op schema te blijven lopen
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {hasVariants && (
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
                >
                  Mailvarianten bekijken ({variants.length})
                </button>
              )}
              {hasPdf && (
                <a
                  href={pdfUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
                >
                  PDF openen
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {pending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    {t('campaign.proposalSending')}
                  </>
                ) : (
                  <>
                    {t('campaign.variantsApprove')}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {open && hasVariants && (
        <MailVariantsModal variants={variants} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
