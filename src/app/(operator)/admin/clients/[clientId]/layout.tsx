import { Suspense, type ReactNode } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { CampaignSwitcher } from './_components/campaign-switcher'

/**
 * Eén balk boven élke pagina van een klant, met rechts de campagneschakelaar.
 *
 * Hij staat in een layout en niet op de pagina's zelf, zodat hij overal
 * hetzelfde is en op één plek onderhouden wordt. De pagina's eronder blijven
 * ongewijzigd; de balk komt er alleen boven.
 *
 * De keuze staat in de URL (?campagne=2) en blijft dus staan als je binnen de
 * klant doorklikt.
 */

interface LayoutProps {
  children: ReactNode
  params: Promise<{ clientId: string }>
}

export default async function ClientLayout({ children, params }: LayoutProps) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('campaign_track_count, campaign_track_1_name, campaign_track_2_name')
    .eq('id', clientId)
    .single()

  const trackCount = client?.campaign_track_count === 2 ? 2 : 1

  return (
    <>
      <div className="mb-4 flex justify-end">
        {/* useSearchParams vereist een Suspense-grens; zonder deze zou elke
            klantpagina in zijn geheel client-side gerenderd worden. */}
        <Suspense fallback={null}>
          <CampaignSwitcher
            clientId={clientId}
            trackCount={trackCount}
            name1={(client?.campaign_track_1_name as string | null) ?? null}
            name2={(client?.campaign_track_2_name as string | null) ?? null}
          />
        </Suspense>
      </div>
      {children}
    </>
  )
}
