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

  const detail = await getSentEmailDetail(client.id, emailId)
  if (!detail) redirect('/dashboard/verzonden')

  return <SentEmailDetail email={detail} />
}
