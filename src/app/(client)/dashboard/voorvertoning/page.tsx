import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { createClient } from '@/lib/supabase/server'
import { PreviewDashboard } from './_components/preview-dashboard'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'Voorvertoning' }
export const dynamic = 'force-dynamic'

export default async function VoorvertoningPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const t = await getTranslator()
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('preview_settings')
    .select('*')
    .eq('client_id', client.id)
    .single()

  if (!settings || (!settings.contact_count && !settings.launch_date)) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('preview.title')}</h1>
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-gray-800">{t('preview.empty')}</h2>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            {t('preview.emptyDescription')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('preview.title')}</h1>
      <p className="mt-1 text-sm text-gray-500">{t('preview.description')}</p>

      <PreviewDashboard
        contactCount={settings.contact_count}
        jobTitles={settings.job_titles ?? []}
        industries={settings.industries ?? []}
        locations={settings.locations ?? []}
        launchDate={settings.launch_date}
      />
    </div>
  )
}
