'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MailVariant, MailVariantFeedbackSubmission } from '@/lib/data/campaign'
import type { WeeklyReport } from '@/lib/data/weekly-reports'
import { MailVariantsModal } from './mail-variants-modal'
import { useT } from '@/lib/i18n/client'

interface Props {
  formSubmissionCount: number
  variantsPdfUrl: string | null
  mailVariants: MailVariant[]
  variantsAcknowledged: boolean
  proposalTitle: string | null
  proposalAcknowledged: boolean
  feedbackByVariant: Record<string, MailVariantFeedbackSubmission>
  weeklyReports: WeeklyReport[]
}

/**
 * Subtle "terug te vinden" section at the bottom of the client campaign page.
 * Groups reference/archive items (form answers, approved variants, PDF, ...)
 * in uniform rows with consistent "Inzien" buttons. Mail variants and PDF
 * only appear here AFTER the client has acknowledged them — before that
 * they're shown in the prominent approval block higher on the page.
 */
export function ArchiveSection({
  formSubmissionCount,
  variantsPdfUrl,
  mailVariants,
  variantsAcknowledged,
  proposalTitle,
  proposalAcknowledged,
  feedbackByVariant,
  weeklyReports,
}: Props) {
  const t = useT()
  const [modalOpen, setModalOpen] = useState(false)

  const hasForm = formSubmissionCount > 0
  const hasPdf = !!variantsPdfUrl
  const hasVariants = mailVariants.length > 0 && variantsAcknowledged
  const hasProposal = !!proposalTitle && proposalAcknowledged
  const hasWeeklyReports = weeklyReports.length > 0

  // If nothing to show yet, don't render the section
  if (!hasForm && !hasPdf && !hasVariants && !hasProposal && !hasWeeklyReports) return null

  return (
    <>
      <section className="pt-4">
        <div className="mb-3 flex items-center gap-3">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            {t('campaign.archiveTitle')}
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
              title={t('campaignSubPages.formTitle')}
              subtitle={t('campaign.archiveFormSubmissions')}
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
              title={t('campaign.archiveVariants')}
              subtitle={t('flow.variantsCount', { count: mailVariants.length })}
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
              title={t('campaign.archiveVariantsPdf')}
              subtitle={t('campaign.archiveDownloadPdf')}
              href={variantsPdfUrl!}
              external
            />
          )}

          {hasProposal && (
            <ArchiveRow
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              }
              title={t('campaign.archiveProposal')}
              subtitle={proposalTitle!}
            />
          )}

          {hasWeeklyReports && <WeeklyReportsRow reports={weeklyReports} />}
        </div>
      </section>

      {modalOpen && (
        <MailVariantsModal
          variants={mailVariants}
          feedbackByVariant={feedbackByVariant}
          onClose={() => setModalOpen(false)}
        />
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
  const t = useT()
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
        {t('common.view')}
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

/**
 * Expandable archive row that reveals the list of weekly-report PDF download
 * links. Collapsed by default; clicking the row toggles the list open.
 */
function WeeklyReportsRow({ reports }: { reports: WeeklyReport[] }) {
  const t = useT()
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-gray-900">{t('campaign.weeklyReportsTitle')}</div>
          <div className="mt-0.5 text-xs text-gray-500">
            {t('campaign.weeklyReportsCount', { count: reports.length })}
          </div>
        </div>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform group-hover:text-indigo-600 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <ul className="divide-y divide-gray-100 border-t border-gray-100 bg-gray-50/50">
          {reports.map((report) => (
            <li key={report.id}>
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 py-3 pl-14 pr-5 transition-colors hover:bg-white"
              >
                <div className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 group-hover:text-indigo-700">
                  {report.name}
                </div>
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-gray-500 transition-colors group-hover:text-indigo-600">
                  {t('campaign.weeklyReportsDownload')}
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
