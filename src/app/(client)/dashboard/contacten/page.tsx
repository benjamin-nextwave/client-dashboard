import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getContactsPage, getContactColumns } from '@/lib/data/contacts-data'
import { ContactsTable } from './_components/contacts-table'

export const dynamic = 'force-dynamic'

interface ContactenPageProps {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function ContactenPage({ searchParams }: ContactenPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) redirect('/login')

  const params = await searchParams
  const page = Math.max(0, parseInt(params.page ?? '0', 10) || 0)
  const search = params.q ?? ''

  const [{ contacts, total }, columns] = await Promise.all([
    getContactsPage(clientId, page, search),
    getContactColumns(clientId),
  ])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Contacten</h1>
      <ContactsTable
        contacts={contacts.map((c) => ({ id: c.id, data: c.data }))}
        columns={columns}
        total={total}
        currentPage={page}
        search={search}
      />
    </div>
  )
}
