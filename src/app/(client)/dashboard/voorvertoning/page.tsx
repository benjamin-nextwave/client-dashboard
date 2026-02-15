import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getPreviewContacts } from '@/lib/data/preview-data'
import { PreviewTable } from './_components/preview-table'

export const dynamic = 'force-dynamic'

export default async function VoorvertoningPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const contacts = await getPreviewContacts(client.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Contactvoorvertoning
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Contacten die binnenkort worden benaderd.
      </p>

      {contacts.length === 0 ? (
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Geen contacten gevonden voor de komende periode.
          </p>
        </div>
      ) : (
        <PreviewTable contacts={contacts} />
      )}
    </div>
  )
}
