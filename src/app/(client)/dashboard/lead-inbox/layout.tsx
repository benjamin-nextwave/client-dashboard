import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { InboxShell } from './_components/inbox-shell'
import { getLeadsWithStatusForCustomer } from './_lib/queries'

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
  const leads = await getLeadsWithStatusForCustomer(
    branding.lead_inbox_customer_id,
    branding.id
  )
  return <InboxShell leads={leads}>{children}</InboxShell>
}
