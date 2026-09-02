'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

export interface CampaignTracksResult {
  error?: string
}

/**
 * Hoeveel campagnes deze klant naast elkaar draait, en hoe ze heten.
 *
 * Puur een onderscheid op het scherm. Het blijft één klant met één client_id;
 * leads, mails, commissies en de loopgang zien de campagnes als van dezelfde
 * klant, precies alsof er meerdere campagne-id's aan gekoppeld zijn.
 */
export async function setCampaignTracksAction(
  clientId: string,
  count: 1 | 2,
  name1: string | null,
  name2: string | null
): Promise<CampaignTracksResult> {
  if (count !== 1 && count !== 2) return { error: 'Kies één of twee campagnes.' }

  const clean = (value: string | null) => {
    const trimmed = value?.trim() ?? ''
    return trimmed === '' ? null : trimmed.slice(0, 80)
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({
      campaign_track_count: count,
      campaign_track_1_name: clean(name1),
      // Terug naar één campagne wist alleen de naam van de tweede; wat er onder
      // campagne 2 is vastgelegd blijft staan en komt terug zodra je er weer
      // twee van maakt.
      campaign_track_2_name: count === 2 ? clean(name2) : null,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  console.log(`[klant] campagnes ingesteld client=${clientId} aantal=${count}`)
  revalidatePath(`/admin/clients/${clientId}`, 'layout')
  return {}
}
