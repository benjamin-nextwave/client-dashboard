import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCsvUploads } from '@/lib/actions/csv-actions'
import { CsvUpload } from './_components/csv-upload'
import { CsvPreview } from './_components/csv-preview'
import { CsvFilterExport } from './_components/csv-filter-export'

export const dynamic = 'force-dynamic'

interface CsvPageProps {
  params: Promise<{ clientId: string }>
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  uploading: { label: 'Uploaden', color: 'bg-yellow-100 text-yellow-800' },
  ready: { label: 'Gereed', color: 'bg-green-100 text-green-800' },
  filtered: { label: 'Gefilterd', color: 'bg-blue-100 text-blue-800' },
  exported: { label: 'Geexporteerd', color: 'bg-gray-100 text-gray-800' },
}

export default async function CsvPage({ params }: CsvPageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  // Fetch client name
  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  const companyName = client?.company_name ?? 'Onbekende klant'

  // Fetch existing uploads
  const uploadsResult = await getCsvUploads(clientId)
  const uploads = Array.isArray(uploadsResult) ? uploadsResult : []

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
        CSV Beheer - {companyName}
      </h2>

      {/* Upload component */}
      <div className="mb-8">
        <CsvUpload clientId={clientId} />
      </div>

      {/* Existing uploads */}
      {uploads.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Eerdere uploads
          </h3>
          <div className="space-y-4">
            {uploads.map((upload) => {
              const status = STATUS_LABELS[upload.status] ?? {
                label: upload.status,
                color: 'bg-gray-100 text-gray-800',
              }
              return (
                <details key={upload.id} className="group">
                  <summary className="cursor-pointer rounded-lg bg-white p-4 shadow-sm hover:bg-gray-50">
                    <div className="inline-flex flex-wrap items-center gap-3">
                      <span className="font-medium text-gray-900">
                        {upload.filename}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}
                      >
                        {status.label}
                      </span>
                      <span className="text-sm text-gray-500">
                        {upload.total_rows} rijen
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(upload.created_at).toLocaleDateString('nl-NL')}
                      </span>
                      {upload.contact_date && (
                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                          Contactdatum: {new Date(upload.contact_date).toLocaleDateString('nl-NL')}
                        </span>
                      )}
                      <span className="text-sm text-gray-400">
                        Verloopt: {new Date(upload.expires_at).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                  </summary>
                  <div className="mt-2">
                    <CsvFilterExport
                      uploadId={upload.id}
                      uploadStatus={upload.status}
                      totalRows={upload.total_rows}
                      emailColumn={upload.email_column}
                    />
                    <CsvPreview uploadId={upload.id} />
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      )}

      {uploads.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          Nog geen CSV-bestanden ge&uuml;pload voor deze klant.
        </div>
      )}
    </div>
  )
}
