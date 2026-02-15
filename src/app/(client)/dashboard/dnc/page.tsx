import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getDncEntries } from '@/lib/actions/dnc-actions'
import { DncAddForm } from './_components/dnc-add-form'
import { DncCsvUpload } from './_components/dnc-csv-upload'
import { DncList } from './_components/dnc-list'

export const dynamic = 'force-dynamic'

export default async function DncPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const entries = await getDncEntries()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Do Not Contact</h1>
      <p className="mt-1 text-sm text-gray-600">
        Beheer uw uitsluitingslijst voor e-mailadressen en domeinen.
      </p>

      <div className="mt-6 space-y-6">
        <DncAddForm />
        <DncCsvUpload />
        <DncList entries={entries} />
      </div>
    </div>
  )
}
