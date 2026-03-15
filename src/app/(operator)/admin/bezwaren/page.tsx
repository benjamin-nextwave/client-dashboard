import { createAdminClient } from '@/lib/supabase/admin'
import { ObjectionList } from './_components/objection-list'

export const dynamic = 'force-dynamic'

export default async function BezwarenPage() {
  const supabase = createAdminClient()

  // Fetch objections with client name
  const { data: rawObjections } = await supabase
    .from('synced_leads')
    .select('id, email, first_name, last_name, company_name, objection_status, objection_data, client_id')
    .not('objection_status', 'is', null)
    .order('updated_at', { ascending: false })

  // Fetch client names for all unique client IDs
  const clientIds = [...new Set((rawObjections ?? []).map((o) => o.client_id))]
  const { data: clients } = clientIds.length > 0
    ? await supabase.from('clients').select('id, company_name').in('id', clientIds)
    : { data: [] }

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.company_name]))

  const objections = (rawObjections ?? []).map((o) => ({
    ...o,
    client_company_name: clientMap.get(o.client_id) ?? 'Onbekend',
  }))

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Bezwaren</h2>
      <p className="mt-1 text-sm text-gray-500">
        Beoordeel ingediende bezwaren van klanten op leads.
      </p>

      <ObjectionList objections={objections} />
    </div>
  )
}
