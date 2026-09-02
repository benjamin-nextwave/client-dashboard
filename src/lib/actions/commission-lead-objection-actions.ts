'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { UNBILLED_LABEL, UNBILLED_OPTION } from '@/lib/leads/objection-options'

/**
 * Bezwaar van een klant tegen de categorie waarin een lead is ingedeeld.
 *
 * De categorie bepaalt het bedrag, dus dit gaat over geld. Er komt geen model
 * aan te pas: de klant kiest zelf uit zijn eigen prijslijst, of zegt dat de lead
 * helemaal niet in rekening hoort te worden gebracht, en schrijft er een reden
 * bij. Die reden komt ongewijzigd op de bezwarenpagina van het admin dashboard.
 */

const MIN_REASON = 10
const MAX_REASON = 2000

const Schema = z.object({
  leadId: z.string().uuid('Onbekende lead.'),
  /** Een categorie-id uit de eigen prijslijst, of de vaste waarde 'onbetaald'. */
  choice: z.string().min(1, 'Kies een categorie.'),
  reason: z
    .string()
    .trim()
    .min(MIN_REASON, `Geef een toelichting van minstens ${MIN_REASON} tekens.`)
    .max(MAX_REASON),
})

export type ObjectionResult = { success?: true; error?: string }

export async function submitCommissionLeadObjection(
  input: z.input<typeof Schema>
): Promise<ObjectionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const role = user.app_metadata?.user_role as string | undefined
  const clientId = user.app_metadata?.client_id as string | undefined
  if (role !== 'client' || !clientId) return { error: 'Geen toegang.' }

  const parsed = Schema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const admin = createAdminClient()

  const { data: lead } = await admin
    .from('operator_commission_leads')
    .select('id, client_id, category_id, category_name')
    .eq('id', parsed.data.leadId)
    .maybeSingle()

  // Dezelfde melding bij "bestaat niet" en "niet van jou": een klant hoort niet
  // te kunnen aftasten welke lead-id's bestaan.
  if (!lead || lead.client_id !== clientId) return { error: 'Lead niet gevonden.' }

  const { data: bestaand } = await admin
    .from('commission_lead_objections')
    .select('id')
    .eq('commission_lead_id', lead.id)
    .maybeSingle()
  if (bestaand) return { error: 'Er loopt al een bezwaar voor deze lead.' }

  let categoryId: string | null = null
  let categoryName: string
  const wantsUnbilled = parsed.data.choice === UNBILLED_OPTION

  if (wantsUnbilled) {
    categoryName = UNBILLED_LABEL
  } else {
    const { data: categorie } = await admin
      .from('operator_client_commission_categories')
      .select('id, name, client_id')
      .eq('id', parsed.data.choice)
      .maybeSingle()

    if (!categorie || categorie.client_id !== clientId) {
      return { error: 'Die categorie hoort niet bij deze campagne.' }
    }
    if (categorie.name === lead.category_name) {
      return { error: 'Dat is de categorie waar de lead nu al in staat — kies een andere.' }
    }
    categoryId = String(categorie.id)
    categoryName = String(categorie.name)
  }

  const { error } = await admin.from('commission_lead_objections').insert({
    commission_lead_id: lead.id,
    client_id: clientId,
    proposed_category_id: categoryId,
    proposed_category_name: categoryName,
    wants_unbilled: wantsUnbilled,
    reason: parsed.data.reason.trim(),
    status: 'pending',
  })

  if (error) return { error: `Indienen mislukt: ${error.message}` }

  console.log(
    `[bezwaar:commissielead] client=${clientId} lead=${lead.id} voorstel=${categoryName} onbetaald=${wantsUnbilled}`
  )

  revalidatePath('/dashboard/campagne-leads')
  revalidatePath('/admin/bezwaren')
  return { success: true }
}
