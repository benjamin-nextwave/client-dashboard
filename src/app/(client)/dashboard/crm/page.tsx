import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCrmEntries, getCrmLabels } from './_lib/queries'
import { getCrmConnections } from './_lib/connections'
import { CrmShell } from './_components/crm-shell'

export const metadata: Metadata = { title: 'CRM' }
export const dynamic = 'force-dynamic'

// De feedback/klacht-knop is tijdelijk: vanaf 31 augustus 2026 (middernacht
// Amsterdamse tijd) verdwijnt hij vanzelf. Bewust hier op de server bepaald,
// zodat de klok van de bezoeker er geen invloed op heeft.
const FEEDBACK_HIDDEN_FROM = new Date('2026-08-31T00:00:00+02:00')

export default async function CrmPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) redirect('/login')

  const [entries, labels, connections] = await Promise.all([
    getCrmEntries(clientId),
    getCrmLabels(clientId),
    getCrmConnections(clientId),
  ])

  return (
    <CrmShell
      initialEntries={entries}
      initialLabels={labels}
      initialConnections={connections}
      showFeedback={new Date() < FEEDBACK_HIDDEN_FROM}
    />
  )
}
