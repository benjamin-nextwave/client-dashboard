'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { activateCampaign, pauseCampaign } from '@/lib/instantly/client'
import {
  getLinkedCampaignRefs,
  resolveInstantlyApiKeys,
  tryInstantlyKeys,
} from '@/lib/data/loopgang'
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

  const apiKeys = await resolveInstantlyApiKeys(clientId)
  if (apiKeys.length === 0) {
    return { error: 'Geen Instantly API-sleutel gevonden voor deze klant.' }
  }

  const results: NonNullable<CampaignActionResult['results']> = []
  let blockedMessage: string | null = null

  for (const ref of refs) {
    try {
      // Een campagne-id bestaat maar in één workspace; de verkeerde sleutel
      // geeft 401/404 zonder iets aan te raken, dus doorvallen is veilig.
      const outcome = await tryInstantlyKeys(
        apiKeys,
        (key) =>
          paused
            ? pauseCampaign(ref.instantlyCampaignId, key)
            : activateCampaign(ref.instantlyCampaignId, key),
        () => true
      )

      if (outcome.value === null) {
        const message =
          outcome.error instanceof Error ? outcome.error.message : 'Onbekende fout'
        results.push({
          id: ref.instantlyCampaignId,
          name: ref.name,
          ok: false,
          error: message,
        })
        console.error(
          `[loopgang] actie mislukt client=${clientId} campaign=${ref.instantlyCampaignId}: ${message}`
        )
        continue
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
      throw err
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
    // Zie de toelichting bij toggleInvoiceMark: deze pagina houdt campagne 1 aan.
    campaign_track: 1,
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

  // Deze pagina kent maar één cyclus per klant en werkt daarom uitsluitend op
  // campagne 1. Een klant met twee campagnes beheer je op /admin/loopgang; zonder
  // deze afbakening zou het wissen hier ook de factuur van campagne 2 op
  // dezelfde dag meenemen.
  if (marked) {
    const { error } = await supabase
      .from('client_invoice_marks')
      .insert({ client_id: clientId, campaign_track: 1, invoice_date: date })
    // 23505 = deze dag stond al aangevinkt; dat is geen fout voor de gebruiker.
    if (error && error.code !== '23505') return { error: error.message }
  } else {
    const { error } = await supabase
      .from('client_invoice_marks')
      .delete()
      .eq('client_id', clientId)
      .eq('campaign_track', 1)
      .eq('invoice_date', date)
    if (error) return { error: error.message }
  }

  revalidatePath(adminPath(clientId))
  return {}
}
