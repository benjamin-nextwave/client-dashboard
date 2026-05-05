import type { ReactNode } from 'react'
import { InboxShell } from './_components/inbox-shell'
import { requireLeadInboxCustomerId } from './_lib/customer'
import { getLeadsWithStatusForCustomer } from './_lib/queries'

export const dynamic = 'force-dynamic'

export default async function LeadInboxLayout({
  children,
}: {
  children: ReactNode
}) {
  const customerId = await requireLeadInboxCustomerId()
  const leads = await getLeadsWithStatusForCustomer(customerId)
  return <InboxShell leads={leads}>{children}</InboxShell>
}
