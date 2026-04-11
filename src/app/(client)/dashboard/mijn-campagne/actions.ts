'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  campaignFormSchema,
  type CampaignFormValues,
  type LocationEntry,
} from '@/lib/validations/campaign-form'

const WEBHOOK_CAMPAIGN_READY = 'https://hook.eu2.make.com/nx6392ay1en939gg5dyh718o7jcwi1wy'
const WEBHOOK_FORM_SUBMITTED = 'https://hook.eu2.make.com/3ygu3f88qqlmle9y7vkp0ilkl83kgipg'
const WEBHOOK_VARIANTS_ACKNOWLEDGED = 'https://hook.eu2.make.com/za5jg3k57b3s01a41itb79d6uuhyu1h1'

async function getClientIdForCurrentUser(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id, user_role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_role !== 'client' || !profile.client_id) return null
  return profile.client_id
}

export async function confirmDncCompleted(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('clients')
    .update({ campaign_dnc_confirmed_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

export async function unconfirmDncCompleted(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('clients')
    .update({ campaign_dnc_confirmed_at: null })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

/**
 * Client confirms the latest mail variants that the operator published.
 * Fires the variants-acknowledged webhook with the client's email + variants
 * and stores the acknowledgement timestamp so the button hides until the
 * operator pushes new changes.
 */
export async function acknowledgeMailVariants(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  // Fetch client info + published variants in parallel
  const [clientRes, variantsRes, profileRes] = await Promise.all([
    admin
      .from('clients')
      .select('id, company_name, notification_email')
      .eq('id', clientId)
      .single(),
    admin
      .from('mail_variants')
      .select('id, mail_number, variant_label, subject, body, explanation, is_published, updated_at')
      .eq('client_id', clientId)
      .eq('is_published', true)
      .order('mail_number', { ascending: true })
      .order('position', { ascending: true }),
    admin
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_role', 'client')
      .single(),
  ])

  if (clientRes.error || !clientRes.data) return { error: 'Klant niet gevonden' }

  let loginEmail: string | null = null
  if (profileRes.data) {
    const { data: authUser } = await admin.auth.admin.getUserById(profileRes.data.id)
    if (authUser?.user?.email) loginEmail = authUser.user.email
  }

  const acknowledgedAt = new Date().toISOString()

  try {
    const res = await fetch(WEBHOOK_VARIANTS_ACKNOWLEDGED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'mail_variants_acknowledged',
        client_id: clientRes.data.id,
        client_name: clientRes.data.company_name,
        client_email: loginEmail,
        notification_email: clientRes.data.notification_email ?? null,
        acknowledged_at: acknowledgedAt,
        variants: (variantsRes.data ?? []).map((v) => ({
          mail_number: v.mail_number,
          variant_label: v.variant_label,
          subject: v.subject,
          body: v.body,
          explanation: v.explanation,
        })),
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  // Also set the legacy campaign_variants_approved_at once, so the existing
  // "both approved → finalize campaign" flow keeps working.
  const { data: existing } = await admin
    .from('clients')
    .select('campaign_variants_approved_at')
    .eq('id', clientId)
    .single()

  const updatePatch: Record<string, unknown> = {
    mail_variants_last_acknowledged_at: acknowledgedAt,
  }
  if (!existing?.campaign_variants_approved_at) {
    updatePatch.campaign_variants_approved_at = acknowledgedAt
  }

  const { error } = await admin.from('clients').update(updatePatch).eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

export async function approvePreview(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  // Guard: can only approve if operator requested it
  const { data: client } = await admin
    .from('clients')
    .select('campaign_preview_approval_requested_at, campaign_preview_approved_at, campaign_completed_at')
    .eq('id', clientId)
    .single()

  if (!client || !client.campaign_preview_approval_requested_at) {
    return { error: 'Goedkeuring is nog niet beschikbaar' }
  }
  if (client.campaign_completed_at) {
    return { error: 'Campagne is al afgerond' }
  }
  if (client.campaign_preview_approved_at) {
    return {} // already approved, no-op
  }

  const { error } = await admin
    .from('clients')
    .update({ campaign_preview_approved_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

export async function approveVariants(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('campaign_variants_approval_requested_at, campaign_variants_approved_at, campaign_completed_at')
    .eq('id', clientId)
    .single()

  if (!client || !client.campaign_variants_approval_requested_at) {
    return { error: 'Goedkeuring is nog niet beschikbaar' }
  }
  if (client.campaign_completed_at) {
    return { error: 'Campagne is al afgerond' }
  }
  if (client.campaign_variants_approved_at) {
    return {}
  }

  const { error } = await admin
    .from('clients')
    .update({ campaign_variants_approved_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

/**
 * Submit the campaign onboarding form. Can only be done once.
 * Returns a field-error map on validation failure.
 */
export async function submitCampaignForm(
  prevState: { fieldErrors?: Record<string, string>; error?: string },
  formData: FormData
): Promise<{ fieldErrors?: Record<string, string>; error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()
  const { data: client } = await admin
    .from('clients')
    .select('id, company_name, campaign_form_allowed_count')
    .eq('id', clientId)
    .single()

  if (!client) return { error: 'Klant niet gevonden' }

  // Guard: check the client still has a submission slot
  const { count: existingCount } = await admin
    .from('campaign_form_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)

  const allowed = client.campaign_form_allowed_count ?? 1
  if ((existingCount ?? 0) >= allowed) {
    return { error: 'Je hebt geen ruimte om het formulier opnieuw in te dienen' }
  }

  const isSkipped = (field: string) => formData.get(`skip_${field}`) === '1'
  const textOrNull = (field: string): string | null => {
    if (isSkipped(field)) return null
    const v = String(formData.get(field) ?? '').trim()
    return v || ''
  }

  // Sectors (array) — either skipped or collected from repeated inputs
  let sectors: string[] | null = null
  if (!isSkipped('sectors')) {
    sectors = formData.getAll('sectors').map((s) => String(s).trim()).filter(Boolean)
  }

  // Locations (array of { location, radiusKm }) — submitted as JSON in a hidden input
  let locations: LocationEntry[] | null = null
  if (!isSkipped('locations')) {
    const raw = String(formData.get('locations') ?? '[]')
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        locations = parsed
          .map((item) => {
            if (!item || typeof item !== 'object') return null
            const obj = item as { location?: unknown; radiusKm?: unknown }
            const loc = typeof obj.location === 'string' ? obj.location.trim() : ''
            const r = Number(obj.radiusKm)
            const radius = r === 0 || r === 25 || r === 50 || r === 100 ? r : 0
            if (!loc) return null
            return { location: loc, radiusKm: radius as 0 | 25 | 50 | 100 }
          })
          .filter((x): x is LocationEntry => x !== null)
      }
    } catch {
      locations = []
    }
  }

  // Company sizes (multi-select)
  let companySizes: CampaignFormValues['companySizes'] = null
  if (!isSkipped('companySizes')) {
    companySizes = formData.getAll('companySizes').map((s) => String(s)) as CampaignFormValues['companySizes']
  }

  // Domains — single skip flag covers both choice and text
  let domainsChoice: CampaignFormValues['domainsChoice'] = null
  let domainsText: CampaignFormValues['domainsText'] = null
  if (!isSkipped('domains')) {
    domainsChoice = (formData.get('domainsChoice') === 'nextwave' ? 'nextwave' : 'user') as
      | 'user'
      | 'nextwave'
    domainsText = String(formData.get('domainsText') ?? '').trim()
  }

  const raw: Partial<CampaignFormValues> = {
    companyName: textOrNull('companyName'),
    senderName: textOrNull('senderName'),
    sectors,
    locations,
    companySizes,
    riskReversal: textOrNull('riskReversal'),
    cta: textOrNull('cta'),
    offer: textOrNull('offer'),
    aboutCompany: textOrNull('aboutCompany'),
    examples: textOrNull('examples'),
    comments: textOrNull('comments'),
    positiveReplyEmail: textOrNull('positiveReplyEmail'),
    domainsChoice,
    domainsText,
  }

  const parsed = campaignFormSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.')
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return { fieldErrors }
  }

  const submittedAt = new Date().toISOString()

  // Insert a new submission row (one-row-per-submission history)
  const { error: insertError } = await admin
    .from('campaign_form_submissions')
    .insert({
      client_id: clientId,
      data: parsed.data,
      submitted_at: submittedAt,
    })

  if (insertError) return { error: insertError.message }

  // Update the denormalized "latest submission" fields on clients
  // (used by the status tracker and the antwoorden fallback view)
  const { error } = await admin
    .from('clients')
    .update({
      campaign_form_data: parsed.data,
      campaign_form_submitted_at: submittedAt,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  // Fire webhook (fire-and-forget: don't block the user if Make is slow/down).
  const answers = parsed.data
  const payload = {
    event: 'campaign_form_submitted',
    client_id: clientId,
    client_name: client?.company_name ?? null,
    submitted_at: submittedAt,
    answers: {
      companyName: answers.companyName,
      senderName: answers.senderName,
      sectors: answers.sectors, // array of strings or null
      locations: answers.locations, // array of { location, radiusKm } or null
      companySizes: answers.companySizes, // array of strings or null
      riskReversal: answers.riskReversal,
      cta: answers.cta,
      offer: answers.offer,
      aboutCompany: answers.aboutCompany,
      examples: answers.examples,
      comments: answers.comments,
      positiveReplyEmail: answers.positiveReplyEmail,
      domains:
        answers.domainsChoice === null
          ? null
          : { choice: answers.domainsChoice, text: answers.domainsText },
    },
    skipped_fields: Object.entries({
      companyName: answers.companyName,
      senderName: answers.senderName,
      sectors: answers.sectors,
      locations: answers.locations,
      companySizes: answers.companySizes,
      riskReversal: answers.riskReversal,
      cta: answers.cta,
      offer: answers.offer,
      aboutCompany: answers.aboutCompany,
      examples: answers.examples,
      comments: answers.comments,
      positiveReplyEmail: answers.positiveReplyEmail,
      domains: answers.domainsChoice,
    })
      .filter(([, v]) => v === null)
      .map(([k]) => k),
  }

  try {
    await fetch(WEBHOOK_FORM_SUBMITTED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error('[campaign form webhook] failed:', err)
  }

  revalidatePath('/dashboard/mijn-campagne')
  redirect('/dashboard/mijn-campagne')
}

/**
 * Called after the client confirms both approvals.
 * Only fires if both preview and variants are approved and not already completed.
 * Triggers the completion webhook and locks further changes.
 */
export async function confirmCampaignApproval(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, company_name, campaign_preview_approved_at, campaign_variants_approved_at, campaign_completed_at')
    .eq('id', clientId)
    .single()

  if (!client) return { error: 'Klant niet gevonden' }
  if (client.campaign_completed_at) return {} // idempotent
  if (!client.campaign_preview_approved_at || !client.campaign_variants_approved_at) {
    return { error: 'Beide onderdelen moeten eerst goedgekeurd zijn' }
  }

  const completedAt = new Date().toISOString()

  // Fire webhook first; if it fails, don't lock the state
  try {
    const res = await fetch(WEBHOOK_CAMPAIGN_READY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        client_name: client.company_name,
        event: 'campaign_approved',
        preview_approved_at: client.campaign_preview_approved_at,
        variants_approved_at: client.campaign_variants_approved_at,
        timestamp: completedAt,
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  const { error } = await admin
    .from('clients')
    .update({ campaign_completed_at: completedAt })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}
