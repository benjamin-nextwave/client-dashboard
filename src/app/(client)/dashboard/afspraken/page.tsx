import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'

const DEFAULT_MEETING_URL = 'https://meetings.nextwave.nl'

export default async function AfsprakenPage() {
  const client = await getClientBranding()

  if (!client) {
    redirect('/login')
  }

  const meetingUrl = client.meeting_url || DEFAULT_MEETING_URL
  redirect(meetingUrl)
}
