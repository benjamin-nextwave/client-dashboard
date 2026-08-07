import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getContactsPage,
  getContactColumns,
  resolveKeyColumns,
  PAGE_SIZES,
} from '@/lib/data/contacts-data'
import { ContactsTable } from './_components/contacts-table'
import { getTranslator } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'

interface ContactenPageProps {
  searchParams: Promise<{ page?: string; q?: string; per?: string }>
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
  const requested = Number(params.per)
  const pageSize = (PAGE_SIZES as readonly number[]).includes(requested)
    ? requested
    : PAGE_SIZES[0]

  const [{ contacts, total }, columns] = await Promise.all([
    getContactsPage(clientId, page, search, pageSize),
    getContactColumns(clientId),
  ])

  const t = await getTranslator()
  const keys = resolveKeyColumns(columns)

  return (
    <div>
      <h1 className="mb-6 text-[25px] font-semibold tracking-[-0.03em]">{t('contacts.title')}</h1>
      <ContactsTable
        contacts={contacts.map((c) => ({ id: c.id, data: c.data }))}
        columns={columns}
        total={total}
        currentPage={page}
        pageSize={pageSize}
        search={search}
        {...keys}
      />
    </div>
  )
}
