'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { LABEL_META, LEAD_LABELS } from '@/lib/data/campaign-leads'

type ActionResult = { success: true; id?: string } | { error: string }

const ClientIdSchema = z.string().uuid('Ongeldig client-ID')

const LeadInputSchema = z.object({
  clientId: ClientIdSchema,
  leadEmail: z.string().email('Geldig e-mailadres vereist').max(320),
  leadName: z.string().max(200).optional().nullable(),
  leadCompany: z.string().max(200).optional().nullable(),
  sentSubject: z.string().max(500).optional().nullable(),
  sentBody: z.string().max(20000).optional().nullable(),
  sentAt: z.string().datetime().optional().nullable(),
  replySubject: z.string().max(500).optional().nullable(),
  replyBody: z.string().max(20000).optional().nullable(),
  receivedAt: z.string().datetime().optional().nullable(),
  label: z.enum(LEAD_LABELS),
  notes: z.string().max(2000).optional().nullable(),
})

const LeadUpdateSchema = LeadInputSchema.extend({
  id: z.string().uuid(),
})

const LeadDeleteSchema = z.object({
  id: z.string().uuid(),
  clientId: ClientIdSchema,
})

async function assertOperator(): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const role = user.app_metadata?.user_role as string | undefined
  if (role !== 'operator') return { error: 'Geen toegang.' }

  return { ok: true }
}

function emptyToNull(v: string | null | undefined): string | null {
  if (v === null || v === undefined) return null
  const trimmed = v.trim()
  return trimmed === '' ? null : trimmed
}

export async function createCampaignLead(
  input: z.input<typeof LeadInputSchema>
): Promise<ActionResult> {
  const auth = await assertOperator()
  if ('error' in auth) return auth

  const parsed = LeadInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }
  const v = parsed.data

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('campaign_leads')
    .insert({
      client_id: v.clientId,
      lead_email: v.leadEmail.trim().toLowerCase(),
      lead_name: emptyToNull(v.leadName),
      lead_company: emptyToNull(v.leadCompany),
      sent_subject: emptyToNull(v.sentSubject),
      sent_body: emptyToNull(v.sentBody),
      sent_at: v.sentAt ?? null,
      reply_subject: emptyToNull(v.replySubject),
      reply_body: emptyToNull(v.replyBody),
      received_at: v.receivedAt ?? new Date().toISOString(),
      label: v.label,
      notes: emptyToNull(v.notes),
    })
    .select('id')
    .single()

  if (error) {
    return { error: `Toevoegen mislukt: ${error.message}` }
  }

  revalidatePath(`/admin/clients/${v.clientId}/campagne-leads`)
  revalidatePath('/dashboard/campagne-leads')
  return { success: true, id: data.id as string }
}

export async function updateCampaignLead(
  input: z.input<typeof LeadUpdateSchema>
): Promise<ActionResult> {
  const auth = await assertOperator()
  if ('error' in auth) return auth

  const parsed = LeadUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }
  const v = parsed.data

  const admin = createAdminClient()

  // Haal huidige row op om te bepalen of de cache moet worden ingevalideerd.
  const { data: current } = await admin
    .from('campaign_leads')
    .select('label, reply_subject, reply_body')
    .eq('id', v.id)
    .eq('client_id', v.clientId)
    .single()

  const newReplySubject = emptyToNull(v.replySubject)
  const newReplyBody = emptyToNull(v.replyBody)
  const labelChanged = current ? current.label !== v.label : true
  const replyChanged = current
    ? current.reply_subject !== newReplySubject || current.reply_body !== newReplyBody
    : true

  const patch: Record<string, unknown> = {
    lead_email: v.leadEmail.trim().toLowerCase(),
    lead_name: emptyToNull(v.leadName),
    lead_company: emptyToNull(v.leadCompany),
    sent_subject: emptyToNull(v.sentSubject),
    sent_body: emptyToNull(v.sentBody),
    sent_at: v.sentAt ?? null,
    reply_subject: newReplySubject,
    reply_body: newReplyBody,
    received_at: v.receivedAt ?? new Date().toISOString(),
    label: v.label,
    notes: emptyToNull(v.notes),
  }

  // Cache invalideren: AI-onderbouwing wordt opnieuw gegenereerd zodra de
  // klant er weer naar vraagt.
  if (labelChanged || replyChanged) {
    patch.label_justification = null
  }

  const { error } = await admin
    .from('campaign_leads')
    .update(patch)
    .eq('id', v.id)
    .eq('client_id', v.clientId)

  if (error) {
    return { error: `Bijwerken mislukt: ${error.message}` }
  }

  revalidatePath(`/admin/clients/${v.clientId}/campagne-leads`)
  revalidatePath('/dashboard/campagne-leads')
  return { success: true }
}

export async function deleteCampaignLead(
  input: z.input<typeof LeadDeleteSchema>
): Promise<ActionResult> {
  const auth = await assertOperator()
  if ('error' in auth) return auth

  const parsed = LeadDeleteSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }
  const v = parsed.data

  const admin = createAdminClient()
  const { error } = await admin
    .from('campaign_leads')
    .delete()
    .eq('id', v.id)
    .eq('client_id', v.clientId)

  if (error) {
    return { error: `Verwijderen mislukt: ${error.message}` }
  }

  revalidatePath(`/admin/clients/${v.clientId}/campagne-leads`)
  revalidatePath('/dashboard/campagne-leads')
  return { success: true }
}

// ─── AI label-onderbouwing ──────────────────────────────────────────────

const GenerateJustificationSchema = z.object({
  leadId: z.string().uuid(),
})

type JustificationResult =
  | { success: true; justification: string }
  | { error: string }

/**
 * Genereert (of haalt uit cache) een korte, specifieke onderbouwing waarom
 * de reactie van de lead bij het toegekende label past. De tekst wordt
 * permanent op de lead-row opgeslagen tot label of reactie wijzigt.
 */
export async function generateLabelJustification(
  input: z.input<typeof GenerateJustificationSchema>
): Promise<JustificationResult> {
  // Auth: zowel operator als de bijbehorende klant mogen dit triggeren.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const role = user.app_metadata?.user_role as string | undefined
  const userClientId = user.app_metadata?.client_id as string | undefined

  const parsed = GenerateJustificationSchema.safeParse(input)
  if (!parsed.success) return { error: 'Ongeldige invoer.' }

  const admin = createAdminClient()
  const { data: lead, error: fetchErr } = await admin
    .from('campaign_leads')
    .select('id, client_id, label, reply_subject, reply_body, label_justification')
    .eq('id', parsed.data.leadId)
    .single()

  if (fetchErr || !lead) return { error: 'Lead niet gevonden.' }

  // Authorisatie: operator OF klant van deze lead
  if (role !== 'operator' && lead.client_id !== userClientId) {
    return { error: 'Geen toegang.' }
  }

  // Cache hit
  if (lead.label_justification) {
    return { success: true, justification: lead.label_justification }
  }

  const labelKey = lead.label as keyof typeof LABEL_META
  const meta = LABEL_META[labelKey]
  if (!meta) return { error: 'Onbekend label.' }

  const replySubject = (lead.reply_subject ?? '').trim()
  const replyBody = (lead.reply_body ?? '').trim()

  if (!replySubject && !replyBody) {
    const fallback =
      'Er is geen reactietekst opgeslagen voor deze lead, dus een specifieke onderbouwing op basis van de inhoud is niet mogelijk.'
    await admin
      .from('campaign_leads')
      .update({ label_justification: fallback })
      .eq('id', lead.id)
    return { success: true, justification: fallback }
  }

  const systemPrompt = `Je bent een B2B sales-analist. Het toegekende label op deze lead is een vaststaand gegeven dat je altijd onderbouwt — je twijfelt er nooit aan, je stelt het nooit ter discussie en je geeft nooit voorbehouden.

Je taak: leg in 2 tot 4 zinnen uit waarom de reactie van de lead leidt tot dit label. Maak concreet welke woorden, intenties of signalen in de tekst aanleiding geven tot deze classificatie.

Regels:
- Schrijf altijd in stellige, bevestigende toon. Geen "lijkt", "mogelijk", "zou kunnen", "het is niet helemaal duidelijk" of soortgelijke twijfeltaal.
- Wees specifiek: citeer of parafraseer concrete zinsdelen uit de reactie.
- Geen generieke uitleg van het label zelf — koppel je analyse aan de werkelijke inhoud van de mail.
- Schrijf in zakelijk Nederlands, in de derde persoon over de lead.
- Geen aanhef, geen afsluiting, geen bullet points. Platte tekst.
- Maximaal 4 zinnen.`

  const userPrompt = `Toegekend label (vaststaand): "${meta.name}"
Beschrijving van het label: ${meta.description}

Reactie van de lead${replySubject ? ` (onderwerp: "${replySubject}")` : ''}:
"""
${replyBody || '(geen body, alleen onderwerp)'}
"""

Onderbouw stellig waarom deze reactie tot dit label leidt.`

  let justification: string
  try {
    const result = await generateText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 400,
      temperature: 0.3,
    })
    justification = result.text.trim()
  } catch (err) {
    console.error('[generateLabelJustification] AI error:', err)
    return { error: 'Onderbouwing kon niet worden gegenereerd. Probeer het later opnieuw.' }
  }

  if (!justification) {
    return { error: 'Lege respons van AI. Probeer het later opnieuw.' }
  }

  // Cache schrijven (best effort: bij failure tonen we 'm wel maar cachen niet)
  await admin
    .from('campaign_leads')
    .update({ label_justification: justification })
    .eq('id', lead.id)

  revalidatePath('/dashboard/campagne-leads')
  return { success: true, justification }
}

// ─── Bezwaar-flow ──────────────────────────────────────────────────────

const SubmitObjectionSchema = z.object({
  leadId: z.string().uuid(),
  text: z.string().trim().min(10, 'Geef minimaal 10 tekens onderbouwing.').max(2000),
})

/** Klant dient bezwaar in tegen het label op een lead. */
export async function submitLeadObjection(
  input: z.input<typeof SubmitObjectionSchema>
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const role = user.app_metadata?.user_role as string | undefined
  const userClientId = user.app_metadata?.client_id as string | undefined
  if (role !== 'client' || !userClientId) return { error: 'Geen toegang.' }

  const parsed = SubmitObjectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const admin = createAdminClient()

  // Eigenaarschap controleren
  const { data: lead } = await admin
    .from('campaign_leads')
    .select('client_id, objection_status')
    .eq('id', parsed.data.leadId)
    .single()

  if (!lead || lead.client_id !== userClientId) return { error: 'Lead niet gevonden.' }
  if (lead.objection_status === 'pending') {
    return { error: 'Er staat al een open bezwaar voor deze lead.' }
  }

  const { error } = await admin
    .from('campaign_leads')
    .update({
      objection_text: parsed.data.text,
      objection_submitted_at: new Date().toISOString(),
      objection_status: 'pending',
      // Reset eventueel oude beoordeling
      objection_response: null,
      objection_resolved_at: null,
    })
    .eq('id', parsed.data.leadId)
    .eq('client_id', userClientId)

  if (error) return { error: `Indienen mislukt: ${error.message}` }

  revalidatePath('/dashboard/campagne-leads')
  revalidatePath('/admin/bezwaren')
  revalidatePath(`/admin/clients/${userClientId}/campagne-leads`)
  return { success: true }
}

const ResolveObjectionSchema = z.object({
  leadId: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  response: z.string().trim().min(5, 'Geef minimaal 5 tekens toelichting.').max(2000),
})

/** Operator beoordeelt een ingediend bezwaar (goedkeuren of afkeuren). */
export async function resolveLeadObjection(
  input: z.input<typeof ResolveObjectionSchema>
): Promise<ActionResult> {
  const auth = await assertOperator()
  if ('error' in auth) return auth

  const parsed = ResolveObjectionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const admin = createAdminClient()
  const { data: lead } = await admin
    .from('campaign_leads')
    .select('client_id, objection_status')
    .eq('id', parsed.data.leadId)
    .single()

  if (!lead) return { error: 'Lead niet gevonden.' }
  if (lead.objection_status !== 'pending') {
    return { error: 'Er staat geen open bezwaar voor deze lead.' }
  }

  const { error } = await admin
    .from('campaign_leads')
    .update({
      objection_status: parsed.data.decision,
      objection_response: parsed.data.response,
      objection_resolved_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.leadId)

  if (error) return { error: `Beoordeling mislukt: ${error.message}` }

  revalidatePath('/dashboard/campagne-leads')
  revalidatePath('/admin/bezwaren')
  revalidatePath(`/admin/clients/${lead.client_id}/campagne-leads`)
  return { success: true }
}
