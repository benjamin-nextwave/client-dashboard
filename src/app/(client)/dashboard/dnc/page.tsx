import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getDncEntries } from '@/lib/actions/dnc-actions'
import { DncAddPanel } from './_components/dnc-add-panel'
import { DncCsvUpload } from './_components/dnc-csv-upload'
import { DncList } from './_components/dnc-list'
import { DncStats } from './_components/dnc-stats'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'DNC Lijst' }
export const dynamic = 'force-dynamic'

export default async function DncPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const entries = await getDncEntries()
  const t = await getTranslator()

  return (
    <div>
      <h1 className="text-[25px] font-semibold tracking-[-0.03em]">{t('dnc.title')}</h1>
      <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
        {t('dnc.intro')}
      </p>

      <DncStats entries={entries} />

      {/* Vaste hoogte omdat de lijst intern scrollt; dezelfde vorm als de
          lead-inbox en de contactenpagina. */}
      <div className="mt-4 flex h-[calc(100vh-22rem)] min-h-[460px] flex-col gap-4 lg:flex-row">
        <DncList entries={entries} />

        <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto lg:w-[344px]">
          <DncAddPanel
            companyName={client.company_name}
            existingValues={entries.map((e) => e.value)}
          />
          <DncCsvUpload companyName={client.company_name} />
          <div className="shrink-0 rounded-panel border border-line bg-panel px-4 py-3.5">
            <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
              {t('dnc.explainerTitle')}
            </h3>
            <p className="mt-[5px] text-[11.5px] leading-[1.6] text-muted">
              {t('dnc.explainerBody')}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
