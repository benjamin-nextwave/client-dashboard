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

export const dynamic = 'force-dynamic'

export default async function OverzichtPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

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
    getMonthlyStats(client.id),
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
      />
    </div>
  )
}
