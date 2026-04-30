import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getDncEntries } from '@/lib/actions/dnc-actions'
import { DncAddForm } from './_components/dnc-add-form'
import { DncCsvUpload } from './_components/dnc-csv-upload'
import { DncList } from './_components/dnc-list'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'DNC Lijst' }
export const dynamic = 'force-dynamic'

export default async function DncPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const entries = await getDncEntries()
  const t = await getTranslator()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('dnc.title')}</h1>
      <p className="mt-1 text-sm text-gray-600">{t('dnc.description')}</p>

      <div className="mt-6 space-y-6">
        <DncAddForm companyName={client.company_name} />
        <DncCsvUpload companyName={client.company_name} />
        <DncList entries={entries} />
      </div>
    </div>
  )
}
