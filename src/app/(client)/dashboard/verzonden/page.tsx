import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { VerzondenClient } from './_components/verzonden-client'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'Verzonden' }
export const dynamic = 'force-dynamic'

export default async function VerzondenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const t = await getTranslator()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('sent.title')}</h1>
      <p className="mt-1 text-sm text-gray-600">{t('sent.description')}</p>
      <VerzondenClient />
    </div>
  )
}
