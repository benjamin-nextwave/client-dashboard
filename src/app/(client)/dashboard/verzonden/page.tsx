import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { VerzondenClient } from './_components/verzonden-client'

export const metadata: Metadata = { title: 'Verzonden' }
export const dynamic = 'force-dynamic'

export default async function VerzondenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Verzonden</h1>
      <p className="mt-1 text-sm text-gray-600">
        Bekijk de e-mails die in de afgelopen 24 uur zijn verzonden vanuit uw campagnes.
      </p>
      <VerzondenClient />
    </div>
  )
}
