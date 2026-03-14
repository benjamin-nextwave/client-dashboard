import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getSentEmailDetail } from '@/lib/data/sent-data'
import { SentEmailDetail } from '../_components/sent-email-detail'

export const dynamic = 'force-dynamic'

export default async function SentEmailDetailPage({
  params,
}: {
  params: Promise<{ emailId: string }>
}) {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const { emailId } = await params

  const email = await getSentEmailDetail(client.id, emailId)
  if (!email) redirect('/dashboard/verzonden')

  return (
    <div>
      <SentEmailDetail email={email} />
    </div>
  )
}
