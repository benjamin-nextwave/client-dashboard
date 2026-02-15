import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getSentEmails } from '@/lib/data/sent-data'
import { SentEmailList } from './_components/sent-email-list'

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
      </p>

      {emails.length === 0 ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Geen verzonden e-mails gevonden.</p>
        </div>
      ) : (
        <SentEmailList emails={emails} />
      )}
    </div>
  )
}
