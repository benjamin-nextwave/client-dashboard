import type { ReactNode } from 'react'
import { InboxShell } from './_components/inbox-shell'
import { HARDCODED_CUSTOMER_ID } from './_lib/constants'
import { getLeadsForCustomer } from './_lib/queries'

export const dynamic = 'force-dynamic'

export default async function LeadInboxLayout({
  children,
}: {
  children: ReactNode
}) {
  const leads = await getLeadsForCustomer(HARDCODED_CUSTOMER_ID)
  return <InboxShell leads={leads}>{children}</InboxShell>
}
