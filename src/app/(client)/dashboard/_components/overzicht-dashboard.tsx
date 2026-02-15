'use client'

import { useState } from 'react'
import { StatsCards } from './stats-cards'
import { ContactStatusChart } from './contact-status-chart'
import { ICPCharts } from './icp-charts'
import { ContactListModal } from './contact-list-modal'

interface Contact {
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  job_title: string | null
  industry: string | null
  lead_status: string | null
  interest_status: string | null
}

interface OverzichtDashboardProps {
  unansweredPositive: number
  totalReplies: number
  positiveLeads: number
  contactCount: number
  emailsSent: number
  contactList: Contact[]
  contactStatus: { status: string; count: number }[]
  industryBreakdown: { name: string; value: number }[]
  jobTitleBreakdown: { name: string; value: number }[]
  positivePatterns: {
    industries: { name: string; value: number }[]
    jobTitles: { name: string; value: number }[]
  }
  brandColor: string
}

export function OverzichtDashboard({
  unansweredPositive,
  totalReplies,
  positiveLeads,
  contactCount,
  emailsSent,
  contactList,
  contactStatus,
  industryBreakdown,
  jobTitleBreakdown,
  positivePatterns,
  brandColor,
}: OverzichtDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <StatsCards
        unansweredPositive={unansweredPositive}
        totalReplies={totalReplies}
        positiveLeads={positiveLeads}
        contactCount={contactCount}
        emailsSent={emailsSent}
        onOpenContactList={() => setIsModalOpen(true)}
      />

      <ContactStatusChart data={contactStatus} />

      <ICPCharts
        industryData={industryBreakdown}
        jobTitleData={jobTitleBreakdown}
        positivePatterns={positivePatterns}
        brandColor={brandColor}
      />

      <ContactListModal
        contacts={contactList}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}
