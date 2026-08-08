import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getReportsByType } from '@/lib/data/weekly-reports'
import { getTranslator } from '@/lib/i18n/server'
import { ReportList } from './_components/report-list'

export const metadata: Metadata = { title: 'Rapporten' }
export const dynamic = 'force-dynamic'

export default async function RapportenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const [{ week, month }, t] = await Promise.all([
    getReportsByType(client.id),
    getTranslator(),
  ])

  return (
    <div>
      <h1 className="text-[25px] font-semibold tracking-[-0.03em]">{t('reportsPage.title')}</h1>
      <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
        {t('reportsPage.intro')}
      </p>

      <div className="mt-6 space-y-5">
        <ReportList
          title={t('reportsPage.weekTitle')}
          reports={week}
          emptyHint={t('reportsPage.weekEmpty')}
        />
        <ReportList
          title={t('reportsPage.monthTitle')}
          reports={month}
          emptyHint={t('reportsPage.monthEmpty')}
        />
      </div>
    </div>
  )
}
