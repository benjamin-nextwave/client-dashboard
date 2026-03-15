import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPreviewSettings } from '@/lib/actions/preview-settings-actions'
import { PreviewSettingsForm } from './_components/preview-settings-form'

export const dynamic = 'force-dynamic'

export default async function PreviewSettingsPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/admin')

  const settings = await getPreviewSettings(clientId)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Terug naar overzicht
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">
        Voorvertoning: {client.company_name}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Stel de campagnegegevens in die zichtbaar worden voor de klant.
      </p>

      <PreviewSettingsForm clientId={clientId} initialSettings={settings} />
    </div>
  )
}
