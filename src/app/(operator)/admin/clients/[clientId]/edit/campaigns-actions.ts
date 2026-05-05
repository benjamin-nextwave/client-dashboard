'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Server actions voor de "Lead-inbox campagnes" sectie op de client-edit page.
// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

function adminPath(clientId: string) {
  return `/admin/clients/${clientId}/edit`
}

export async function addCampaign(
  clientId: string,
  customerId: string,
  name: string,
  instantlyCampaignId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const trimmedName = name.trim()
  const trimmedId = instantlyCampaignId.trim()
  if (!trimmedName) return { error: 'Naam mag niet leeg zijn' }
  if (!trimmedId) return { error: 'Instantly campaign ID mag niet leeg zijn' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('campaigns').insert({
    customer_id: customerId,
    name: trimmedName,
    instantly_campaign_id: trimmedId,
    is_active: isActive,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Deze Instantly campagne is al gekoppeld' }
    }
    return { error: error.message }
  }

  revalidatePath(adminPath(clientId))
  return {}
}

export async function setCampaignActive(
  clientId: string,
  campaignId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaigns')
    .update({ is_active: isActive })
    .eq('id', campaignId)

  if (error) return { error: error.message }
  revalidatePath(adminPath(clientId))
  return {}
}

export async function deleteCampaign(
  clientId: string,
  campaignId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)

  if (error) return { error: error.message }
  revalidatePath(adminPath(clientId))
  return {}
}
