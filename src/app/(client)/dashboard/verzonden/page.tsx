import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getSentEmails } from '@/lib/data/sent-data'
import { EmptyState } from '@/components/ui/empty-state'
import { SentEmailList } from './_components/sent-email-list'

export const metadata: Metadata = { title: 'Verzonden' }
export const dynamic = 'force-dynamic'

export default async function VerzondenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const emails = await getSentEmails(client.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Verzonden</h1>
      <p className="mt-1 text-sm text-gray-600">
        Alle verzonden campagne e-mails.
        <span className="ml-1 text-xs text-gray-400">(Wordt eenmaal per dag bijgewerkt om 06:00)</span>
      </p>

      {emails.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          }
          title="Geen verzonden e-mails"
          description="Verzonden campagne e-mails verschijnen hier zodra de volgende sync is uitgevoerd."
        />
      ) : (
        <SentEmailList emails={emails} />
      )}
    </div>
  )
}
