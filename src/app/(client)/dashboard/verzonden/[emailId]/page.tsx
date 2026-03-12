import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'

export const dynamic = 'force-dynamic'

export default async function SentEmailDetailPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  redirect('/dashboard/verzonden')
}
