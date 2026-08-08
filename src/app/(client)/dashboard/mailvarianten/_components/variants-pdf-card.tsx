'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acknowledgeMailVariants } from '../../mijn-campagne/actions'
import { useT } from '@/lib/i18n/client'

interface Props {
  pdfUrl: string
  /**
   * Alleen waar als de PDF nieuwer is dan het laatste akkoord én er geen open
   * tekstvariant meer is. Dezelfde voorwaarde als in het oude goedkeuringsblok:
   * staat er nog een variant open, dan loopt het akkoord via het detailpaneel.
   */
  needsAcknowledge: boolean
}

export function VariantsPdfCard({ pdfUrl, needsAcknowledge }: Props) {
  const t = useT()
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function acknowledge() {
    setError('')
    startTransition(async () => {
      const res = await acknowledgeMailVariants()
      if (res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="shrink-0 rounded-[11px] border border-line bg-panel px-3.5 py-[13px]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-track text-faint">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[13px] w-[13px]"
          >
            <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold tracking-[-0.01em]">
          {t('mailVariantsPage.pdfTitle')}
        </span>
      </div>

      {error && <p className="mt-2 text-[11.5px] leading-[1.5] text-neg">{error}</p>}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-[30px] items-center gap-[7px] whitespace-nowrap rounded-control border border-line bg-panel px-[11px] text-[11.5px] font-semibold transition-colors hover:bg-[var(--brand-08)]"
        >
          {t('mailVariantsPage.pdfOpen')}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>

        {needsAcknowledge && (
          <button
            type="button"
            onClick={acknowledge}
            disabled={pending}
            className="flex h-[30px] cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-control border border-[color-mix(in_oklab,var(--color-pos)_40%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-pos)_9%,transparent)] px-[11px] text-[11.5px] font-semibold text-pos transition-colors hover:bg-[color-mix(in_oklab,var(--color-pos)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t('mailVariantsPage.sending') : t('mailVariantsPage.pdfApprove')}
          </button>
        )}
      </div>
    </div>
  )
}
