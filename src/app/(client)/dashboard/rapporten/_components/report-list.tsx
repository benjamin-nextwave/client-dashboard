'use client'

import type { WeeklyReport } from '@/lib/data/weekly-reports'
import { useT } from '@/lib/i18n/client'

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function ReportList({
  title,
  reports,
  emptyHint,
}: {
  title: string
  reports: WeeklyReport[]
  emptyHint: string
}) {
  const t = useT()

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-[15px]">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h2>
        <span className="text-[11.5px] tabular-nums text-faint">
          {reports.length === 1
            ? t('reportsPage.countSingular')
            : t('reportsPage.count', { count: reports.length })}
        </span>
      </div>

      {reports.length === 0 ? (
        <p className="px-5 py-10 text-center text-[12.5px] text-muted">{emptyHint}</p>
      ) : (
        <ul>
          {reports.map((report, i) => (
            <li key={report.id} className={i > 0 ? 'border-t border-line' : ''}>
              <a
                href={report.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--brand-05)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-track text-muted transition-colors group-hover:bg-[var(--brand-10)] group-hover:text-brand-ink">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                    {report.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] tabular-nums text-faint">
                    {DATE_FMT.format(new Date(report.createdAt))}
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11.5px] font-medium text-muted transition-colors group-hover:text-fg">
                  {t('reportsPage.download')}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
