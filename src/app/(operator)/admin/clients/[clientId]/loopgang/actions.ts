'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateCampaign, pauseCampaign } from '@/lib/instantly/client'
import { getLinkedCampaignRefs, resolveInstantlyApiKey } from '@/lib/data/loopgang'
import { isOutboundBlocked } from '@/lib/safety/write-guard'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

function adminPath(clientId: string) {
  return `/admin/clients/${clientId}/loopgang`
}

export interface CampaignActionResult {
  error?: string
  /** Per campagne of de Instantly-aanroep lukte. */
  results?: Array<{ id: string; name: string; ok: boolean; error?: string }>
}

/**
 * Pauzeert of hervat álle gekoppelde campagnes van een klant in Instantly en
 * legt de actie vast. Het loggen gebeurt ook als een deel mislukt: zonder log
 * is later niet meer te zien wanneer een klant is stilgezet.
 */
export async function setClientCampaignsPaused(
  clientId: string,
  paused: boolean,
  note?: string
): Promise<CampaignActionResult> {
  const refs = await getLinkedCampaignRefs(clientId)
  if (refs.length === 0) {
    return { error: 'Deze klant heeft geen gekoppelde campagnes.' }
  }

  const apiKey = await resolveInstantlyApiKey(clientId)
  if (!apiKey) {
    return { error: 'Geen Instantly API-sleutel gevonden voor deze klant.' }
  }

  const results: NonNullable<CampaignActionResult['results']> = []
  let blockedMessage: string | null = null

  for (const ref of refs) {
    try {
      if (paused) {
        await pauseCampaign(ref.instantlyCampaignId, apiKey)
      } else {
        await activateCampaign(ref.instantlyCampaignId, apiKey)
      }
      results.push({ id: ref.instantlyCampaignId, name: ref.name, ok: true })
      console.log(
        `[loopgang] campagne ${paused ? 'gepauzeerd' : 'hervat'} client=${clientId} campaign=${ref.instantlyCampaignId}`
      )
    } catch (err) {
      if (isOutboundBlocked(err)) {
        blockedMessage = err.message
        break
      }
      const message = err instanceof Error ? err.message : 'Onbekende fout'
      results.push({
        id: ref.instantlyCampaignId,
        name: ref.name,
        ok: false,
        error: message,
      })
      console.error(
        `[loopgang] actie mislukt client=${clientId} campaign=${ref.instantlyCampaignId}: ${message}`
      )
    }
  }

  // De grendel betekent "dit gaat hier nooit werken": niets veranderd, dus ook
  // niets loggen. Anders zou de kalender een pauze tonen die niet bestaat.
  if (blockedMessage) {
    return { error: blockedMessage }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('client_campaign_pause_events').insert({
    client_id: clientId,
    action: paused ? 'pause' : 'resume',
    campaigns: results,
    note: note?.trim() || null,
  })

  if (error) {
    return { error: `Actie uitgevoerd, maar loggen mislukte: ${error.message}` }
  }

  revalidatePath(adminPath(clientId))

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    return {
      results,
      error: `${failed.length} van ${results.length} campagnes mislukt: ${failed
        .map((f) => f.name)
        .join(', ')}`,
    }
  }

  return { results }
}

/** Zet of haalt de markering "factuur verstuurd" op één dag. */
export async function toggleInvoiceMark(
  clientId: string,
  date: string,
  marked: boolean
): Promise<{ error?: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: 'Ongeldige datum.' }
  }

  const supabase = createAdminClient()

  if (marked) {
    const { error } = await supabase
      .from('client_invoice_marks')
      .insert({ client_id: clientId, invoice_date: date })
    // 23505 = deze dag stond al aangevinkt; dat is geen fout voor de gebruiker.
    if (error && error.code !== '23505') return { error: error.message }
  } else {
    const { error } = await supabase
      .from('client_invoice_marks')
      .delete()
      .eq('client_id', clientId)
      .eq('invoice_date', date)
    if (error) return { error: error.message }
  }

  revalidatePath(adminPath(clientId))
  return {}
}
