import { getErrorLogs } from '@/lib/data/error-logs'
import { ErrorLogTable } from './_components/error-log-table'

export const dynamic = 'force-dynamic'

export default async function ErrorsPage() {
  const errors = await getErrorLogs()
  const unresolvedCount = errors.filter((e) => !e.is_resolved).length

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Foutmonitoring</h2>
      <p className="mt-1 text-sm text-gray-500">
        {unresolvedCount === 0
          ? 'Geen openstaande fouten'
          : `${unresolvedCount} openstaande ${unresolvedCount === 1 ? 'fout' : 'fouten'}`}
      </p>

      <div className="mt-6">
        <ErrorLogTable errors={errors} />
      </div>
    </div>
  )
}
