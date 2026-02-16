import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import {
  getMonthlyStats,
  getUnansweredPositiveCount,
  getContactCount,
  getContactList,
  getContactStatusBreakdown,
  getIndustryBreakdown,
  getJobTitleBreakdown,
  getPositiveLeadPatterns,
} from '@/lib/data/campaign-stats'
import { OverzichtDashboard } from './_components/overzicht-dashboard'

export const metadata: Metadata = { title: 'Overzicht' }
export const dynamic = 'force-dynamic'

function getDateRange(range: string | undefined): { startDate?: string; endDate?: string; label: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  switch (range) {
    case '7d':
      return {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 7 dagen',
      }
    case '30d':
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 30 dagen',
      }
    case '90d':
      return {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 90 dagen',
      }
    case 'month':
      return {
        startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        endDate,
        label: 'Deze maand',
      }
    case 'all':
      return { label: 'Alle tijd' }
    default:
      return {
        startDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
        endDate,
        label: 'Deze maand',
      }
  }
}

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const params = await searchParams
  const { startDate, endDate, label: periodLabel } = getDateRange(params.range)

  const [
    monthlyStats,
    unansweredPositive,
    contactCount,
    contactList,
    contactStatus,
    industryBreakdown,
    jobTitleBreakdown,
    positivePatterns,
  ] = await Promise.all([
    getMonthlyStats(client.id, startDate, endDate),
    getUnansweredPositiveCount(client.id),
    getContactCount(client.id),
    getContactList(client.id),
    getContactStatusBreakdown(client.id),
    getIndustryBreakdown(client.id),
    getJobTitleBreakdown(client.id),
    getPositiveLeadPatterns(client.id),
  ])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Overzicht</h1>
      <OverzichtDashboard
        unansweredPositive={unansweredPositive}
        totalReplies={monthlyStats.totalReplies}
        positiveLeads={monthlyStats.positiveLeads}
        contactCount={contactCount}
        emailsSent={monthlyStats.emailsSent}
        contactList={contactList}
        contactStatus={contactStatus}
        industryBreakdown={industryBreakdown}
        jobTitleBreakdown={jobTitleBreakdown}
        positivePatterns={positivePatterns}
        brandColor={client.primary_color ?? '#3B82F6'}
        currentRange={params.range ?? ''}
        periodLabel={periodLabel}
      />
    </div>
  )
}
