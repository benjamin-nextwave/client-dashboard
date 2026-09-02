'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Een bezwaar op een commissielead afhandelen.
 *
 * Toekennen past de commissieregel zélf aan. Anders zou het bezwaar alleen een
 * aantekening zijn en zou het financieel overzicht het oude bedrag blijven
 * gebruiken — dan is de klant het eens geworden over iets dat nergens is
 * doorgevoerd.
 *
 * Auth volgt het bestaande admin-patroon: de middleware gate't /admin op
 * user_role='operator'; deze actie draait met service_role.
 */

export interface ResolveResult {
  error?: string
}

export async function resolveCommissionLeadObjection(input: {
  objectionId: string
  besluit: 'approved' | 'rejected'
  response: string | null
}): Promise<ResolveResult> {
  const supabase = createAdminClient()

  const { data: objection } = await supabase
    .from('commission_lead_objections')
    .select(
      'id, commission_lead_id, proposed_category_id, proposed_category_name, wants_unbilled, status'
    )
    .eq('id', input.objectionId)
    .maybeSingle()

  if (!objection) return { error: 'Bezwaar niet gevonden.' }
  if (objection.status !== 'pending') return { error: 'Dit bezwaar is al afgehandeld.' }

  if (input.besluit === 'approved') {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (objection.wants_unbilled) {
      // Niet in rekening brengen: de regel blijft staan als geschiedenis, maar
      // telt nergens meer mee.
      patch.is_rejected = true
    } else {
      const { data: categorie } = await supabase
        .from('operator_client_commission_categories')
        .select('id, name, price_cents')
        .eq('id', objection.proposed_category_id ?? '')
        .maybeSingle()

      if (!categorie) {
        return {
          error:
            'De voorgestelde categorie bestaat niet meer. Pas de lead met de hand aan in Commissies.',
        }
      }
      patch.category_id = categorie.id
      patch.category_name = categorie.name
      patch.unit_price_cents = categorie.price_cents
      patch.is_rejected = false
    }

    const { error: leadError } = await supabase
      .from('operator_commission_leads')
      .update(patch)
      .eq('id', objection.commission_lead_id)

    if (leadError) return { error: `Aanpassen van de lead mislukt: ${leadError.message}` }
  }

  const { error } = await supabase
    .from('commission_lead_objections')
    .update({
      status: input.besluit,
      response: input.response,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', objection.id)

  if (error) return { error: `Afhandelen mislukt: ${error.message}` }

  console.log(
    `[bezwaar:commissielead] afgehandeld id=${objection.id} besluit=${input.besluit} onbetaald=${objection.wants_unbilled}`
  )

  revalidatePath('/admin/bezwaren')
  revalidatePath('/admin/commissies')
  revalidatePath('/dashboard/campagne-leads')
  return {}
}
