import Link from 'next/link'
import { getClientOverviews } from '@/lib/data/admin-stats'
import { ClientOverviewList } from './_components/client-overview-list'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const clients = await getClientOverviews()

  const issueCount = clients.filter((c) => c.hasIssues).length

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klanten beheer</h2>
          <p className="mt-1 text-sm text-gray-500">
            {clients.length} klant{clients.length !== 1 ? 'en' : ''}
            {issueCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                {issueCount} met problemen
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Nieuwe klant
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-gray-500">Nog geen klanten</p>
          <Link
            href="/admin/clients/new"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Maak de eerste klant aan
          </Link>
        </div>
      ) : (
        <ClientOverviewList clients={clients} />
      )}
    </div>
  )
}
