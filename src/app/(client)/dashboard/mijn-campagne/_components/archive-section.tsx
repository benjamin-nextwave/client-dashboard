'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MailVariant } from '@/lib/data/campaign'
import { MailVariantsModal } from './mail-variants-modal'

interface Props {
  formSubmissionCount: number
  variantsPdfUrl: string | null
  mailVariants: MailVariant[]
  variantsAcknowledged: boolean
}

/**
 * Subtle "terug te vinden" section at the bottom of the client campaign page.
 * Groups reference/archive items (form answers, approved variants, PDF, ...)
 * in uniform rows with consistent "Inzien" buttons. Mail variants and PDF
 * only appear here AFTER the client has acknowledged them — before that
 * they're shown in the prominent approval block higher on the page.
 */
export function ArchiveSection({ formSubmissionCount, variantsPdfUrl, mailVariants, variantsAcknowledged }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  const hasForm = formSubmissionCount > 0
  const hasPdf = !!variantsPdfUrl && variantsAcknowledged
  const hasVariants = mailVariants.length > 0 && variantsAcknowledged

  // If nothing to show yet, don't render the section
  if (!hasForm && !hasPdf && !hasVariants) return null

  return (
    <>
      <section className="pt-4">
        <div className="mb-3 flex items-center gap-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Terug te vinden
          </h2>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {hasForm && (
            <ArchiveRow
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              }
              title="Invulformulier"
              subtitle={
                formSubmissionCount === 1
                  ? 'Je ingediende antwoorden'
                  : `${formSubmissionCount} ingediende invulformulieren`
              }
              href="/dashboard/mijn-campagne/antwoorden"
            />
          )}

          {hasVariants && (
            <ArchiveRow
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              }
              title="Mailvarianten"
              subtitle={`${mailVariants.length} ${mailVariants.length === 1 ? 'variant' : 'varianten'} · tekst`}
              onClick={() => setModalOpen(true)}
            />
          )}

          {hasPdf && (
            <ArchiveRow
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              }
              title="Mailvarianten PDF"
              subtitle="Downloadbaar document"
              href={variantsPdfUrl!}
              external
            />
          )}
        </div>
      </section>

      {modalOpen && (
        <MailVariantsModal variants={mailVariants} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}

function ArchiveRow({
  icon,
  title,
  subtitle,
  href,
  onClick,
  external,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  href?: string
  onClick?: () => void
  external?: boolean
}) {
  const content = (
    <>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-0.5 text-xs text-gray-500">{subtitle}</div>
      </div>
      <div className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors group-hover:text-indigo-600">
        Inzien
        <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </>
  )

  const className =
    'group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50'

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {content}
        </a>
      )
    }
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}
