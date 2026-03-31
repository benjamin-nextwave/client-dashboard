import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getContactColumns, type ContactColumn } from '@/lib/actions/contact-actions'
import { getContactsCount } from '@/lib/data/contacts-data'
import { ContactsImport } from './_components/contacts-import'
import { ContactsDeleteButton } from './_components/contacts-delete-button'

export const dynamic = 'force-dynamic'

interface ContactenPageProps {
  params: Promise<{ clientId: string }>
}

export default async function ContactenPage({ params }: ContactenPageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  const companyName = client?.company_name ?? 'Onbekende klant'

  const columnsResult = await getContactColumns(clientId)
  const columns = Array.isArray(columnsResult) ? columnsResult : []
  const contactCount = await getContactsCount(clientId)

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href={`/admin/clients/${clientId}/edit`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Terug naar klant
        </Link>
      </div>

      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Contactenlijst - {companyName}
      </h2>

      {/* Stats */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500">Contacten</p>
          <p className="text-2xl font-bold text-gray-900">{contactCount.toLocaleString('nl-NL')}</p>
        </div>
        <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500">Kolommen</p>
          <p className="text-2xl font-bold text-gray-900">{columns.length}</p>
        </div>
        {contactCount > 0 && (
          <ContactsDeleteButton clientId={clientId} contactCount={contactCount} />
        )}
      </div>

      {/* Existing columns */}
      {columns.length > 0 && (
        <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Bestaande kolommen</h3>
          <div className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <span
                key={col.id}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                {col.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Import */}
      <ContactsImport clientId={clientId} existingColumns={columns} />
    </div>
  )
}
