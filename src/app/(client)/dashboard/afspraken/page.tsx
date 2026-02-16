import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'

export const metadata: Metadata = { title: 'Afspraken' }

const DEFAULT_MEETING_URL = 'https://meetings.nextwave.nl'

export default async function AfsprakenPage() {
  const client = await getClientBranding()

  if (!client) {
    redirect('/login')
  }

  const meetingUrl = client.meeting_url || DEFAULT_MEETING_URL

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-gray-500">U wordt doorgestuurd naar de afsprakenpagina...</p>
      <a
        href={meetingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-sm font-medium text-brand hover:opacity-80"
      >
        Klik hier als u niet automatisch wordt doorgestuurd
      </a>
    </div>
  )
}
