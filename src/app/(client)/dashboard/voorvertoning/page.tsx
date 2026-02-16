import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getPreviewContacts } from '@/lib/data/preview-data'
import { EmptyState } from '@/components/ui/empty-state'
import { PreviewTable } from './_components/preview-table'

export const metadata: Metadata = { title: 'Voorvertoning' }
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
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          title="Geen contacten voor voorvertoning"
          description="Contacten die binnenkort worden benaderd verschijnen hier."
        />
      ) : (
        <PreviewTable contacts={contacts} />
      )}
    </div>
  )
}
