import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { isRompslompConfigured } from '@/lib/rompslomp/client'
import { contactsFromInvoices, listSalesInvoices } from '@/lib/rompslomp/sales-invoices'
import { KoppelTabel } from './_components/koppel-tabel'

export const dynamic = 'force-dynamic'

export default async function RompslompKoppelPage() {
  const supabase = createAdminClient()

  const { data: clientRows } = await supabase
    .from('clients')
    .select('id, company_name, rompslomp_contact_id, loopgang_visible')
    .eq('is_hidden', false)
    .order('company_name')

  const clients = (clientRows ?? []).map((c) => ({
    id: c.id as string,
    name: c.company_name as string,
    contactId: (c.rompslomp_contact_id as number | null) ?? null,
    inLoopgang: Boolean(c.loopgang_visible),
  }))

  const configured = isRompslompConfigured('invoices')
  const result = configured ? await listSalesInvoices() : null
  const invoices = result?.ok ? result.value : []
  const contacts = contactsFromInvoices(invoices)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link
          href="/admin/loopgang"
          className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-gray-900"
        >
          ← Loopgang
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          Facturen uit Rompslomp
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Koppel elk Rompslomp-contact aan de klant waar zijn facturen bij horen. Daarna kun je de
          facturen overnemen in de loopgang, in plaats van ze met de hand in te voeren.
        </p>
      </header>

      {!configured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Er is geen Rompslomp-token ingesteld. Zet{' '}
          <code className="font-mono">ROMPSLOMP_INVOICES_API_TOKEN</code> en{' '}
          <code className="font-mono">ROMPSLOMP_COMPANY_ID</code> in de omgevingsvariabelen.
        </p>
      ) : result && !result.ok ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900">
          Rompslomp gaf een fout: {result.error}
        </p>
      ) : (
        <KoppelTabel clients={clients} contacts={contacts} invoiceCount={invoices.length} />
      )}
    </div>
  )
}
