import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createAdminClient()

  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url, is_recruitment, created_at')
    .order('created_at', { ascending: false })

  const { data: campaignCounts } = await supabase
    .from('client_campaigns')
    .select('client_id, id')

  // Build campaign count map
  const countMap: Record<string, number> = {}
  if (campaignCounts) {
    for (const row of campaignCounts) {
      countMap[row.client_id] = (countMap[row.client_id] || 0) + 1
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Klanten beheer</h2>
        <Link
          href="/admin/clients/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nieuwe klant
        </Link>
      </div>

      {clientsError && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          Fout bij ophalen klanten: {clientsError.message}
        </div>
      )}

      {!clientsError && (!clients || clients.length === 0) && (
        <div className="mt-8 text-center">
          <p className="text-gray-500">Nog geen klanten</p>
          <Link
            href="/admin/clients/new"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Maak de eerste klant aan
          </Link>
        </div>
      )}

      {clients && clients.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Kleur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Bedrijfsnaam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Campagnes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Aangemaakt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actie
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div
                      className="h-6 w-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: client.primary_color }}
                      title={client.primary_color}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                    {client.company_name}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {client.is_recruitment && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                        Recruitment
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {countMap[client.id] || 0}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {new Date(client.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                    <Link
                      href={`/admin/clients/${client.id}/edit`}
                      className="text-blue-600 hover:underline"
                    >
                      Bewerken
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
