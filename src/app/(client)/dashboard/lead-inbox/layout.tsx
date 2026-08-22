import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { InboxShell } from './_components/inbox-shell'
import { getLeadsWithStatusForCustomer } from './_lib/queries'
import { getAssistantSettings } from './_lib/assistant'

export const dynamic = 'force-dynamic'

export default async function LeadInboxLayout({
  children,
}: {
  children: ReactNode
}) {
  const branding = await getClientBranding()
  if (!branding?.lead_inbox_visible || !branding.lead_inbox_customer_id) {
    redirect('/dashboard')
  }
  const [leads, assistantSettings] = await Promise.all([
    getLeadsWithStatusForCustomer(branding.lead_inbox_customer_id, branding.id),
    getAssistantSettings(branding.id),
  ])
  return (
    <InboxShell leads={leads} assistantSettings={assistantSettings}>
      {children}
    </InboxShell>
  )
}
