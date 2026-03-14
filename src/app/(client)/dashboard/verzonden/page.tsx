import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { SentEmailLoader } from './_components/sent-email-loader'

export const metadata: Metadata = { title: 'Verzonden' }
export const dynamic = 'force-dynamic'

export default async function VerzondenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Verzonden</h1>
      <SentEmailLoader />
    </div>
  )
}
