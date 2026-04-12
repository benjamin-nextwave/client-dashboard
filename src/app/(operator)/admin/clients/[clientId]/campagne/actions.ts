'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadCampaignVariantsPdf, deleteCampaignVariantsPdf } from '@/lib/supabase/storage'

const WEBHOOK_DRAFTS_READY = 'https://hook.eu2.make.com/02qcuro6xst3wtzcatla7i3frn9ssyod'
const WEBHOOK_VARIANTS_MAIL_CLIENT = 'https://hook.eu2.make.com/o6zor5msxznwn2gw5tvjygp1b2ems1n1'

function adminPaths(clientId: string) {
  return [
    `/admin/clients/${clientId}/campagne`,
    `/dashboard/mijn-campagne`,
  ]
}

export async function updateCampaignFlags(
  clientId: string,
  updates: {
    mailDraftsReady?: boolean
    previewFilled?: boolean
  }
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const patch: Record<string, unknown> = {}
  if (updates.mailDraftsReady !== undefined) patch.campaign_mail_drafts_ready = updates.mailDraftsReady
  if (updates.previewFilled !== undefined) patch.campaign_preview_filled = updates.previewFilled

  const { error } = await supabase.from('clients').update(patch).eq('id', clientId)
  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function updateApprovalDeadline(
  clientId: string,
  deadline: string | null
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ campaign_approval_deadline: deadline })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function requestPreviewApproval(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ campaign_preview_approval_requested_at: new Date().toISOString() })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function requestVariantsApproval(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  // Bulk-publish all existing variants for this client
  const { error: publishError } = await supabase
    .from('mail_variants')
    .update({ is_published: true, updated_at: nowIso })
    .eq('client_id', clientId)

  if (publishError) return { error: publishError.message }

  const { error } = await supabase
    .from('clients')
    .update({
      campaign_variants_approval_requested_at: nowIso,
      campaign_variants_last_published_at: nowIso,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

/**
 * Publish or unpublish a single mail variant. Variants stay in the operator
 * editor either way — this flag only controls whether the client sees it.
 */
export async function setMailVariantPublished(
  variantId: string,
  clientId: string,
  published: boolean
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('mail_variants')
    .update({ is_published: published, updated_at: new Date().toISOString() })
    .eq('id', variantId)

  if (error) return { error: error.message }

  // If this is the first time anything is being published for this client,
  // also mark the campaign-level approval-requested flag so Task 4 appears.
  if (published) {
    const now = new Date().toISOString()
    const { data: client } = await supabase
      .from('clients')
      .select('campaign_variants_approval_requested_at')
      .eq('id', clientId)
      .single()

    const patch: Record<string, unknown> = {
      campaign_variants_last_published_at: now,
    }
    if (client && !client.campaign_variants_approval_requested_at) {
      patch.campaign_variants_approval_requested_at = now
    }
    await supabase.from('clients').update(patch).eq('id', clientId)
  }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

/**
 * Give the client permission to submit the form one more time.
 * Increments the total allowed submissions by 1.
 */
export async function allowAnotherFormSubmission(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('campaign_form_allowed_count')
    .eq('id', clientId)
    .single()

  if (fetchError || !client) return { error: 'Klant niet gevonden' }

  const current = client.campaign_form_allowed_count ?? 1
  const { error } = await supabase
    .from('clients')
    .update({ campaign_form_allowed_count: current + 1 })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function triggerDraftsReadyWebhook(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, company_name, notification_email, campaign_mail_drafts_ready, campaign_preview_filled, campaign_approval_deadline')
    .eq('id', clientId)
    .single()

  if (fetchError || !client) return { error: 'Klant niet gevonden' }
  if (!client.campaign_mail_drafts_ready || !client.campaign_preview_filled) {
    return { error: 'Markeer eerst beide onderdelen als klaar' }
  }

  // Fetch the client's login email (auth.users via profiles)
  let loginEmail: string | null = null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) loginEmail = authUser.user.email
  }

  try {
    const res = await fetch(WEBHOOK_DRAFTS_READY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        client_name: client.company_name,
        client_email: loginEmail,
        notification_email: client.notification_email ?? null,
        approval_deadline: client.campaign_approval_deadline ?? null,
        event: 'drafts_ready',
        timestamp: new Date().toISOString(),
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  return {}
}

/**
 * Fire the "mail the client about mail variants" webhook with the client's
 * login email + name.
 */
export async function mailClientAboutVariants(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, company_name, notification_email, campaign_approval_deadline')
    .eq('id', clientId)
    .single()

  if (fetchError || !client) return { error: 'Klant niet gevonden' }

  // Fetch login email via profile → auth user
  let loginEmail: string | null = null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) loginEmail = authUser.user.email
  }

  try {
    const res = await fetch(WEBHOOK_VARIANTS_MAIL_CLIENT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        client_name: client.company_name,
        client_email: loginEmail,
        notification_email: client.notification_email ?? null,
        approval_deadline: client.campaign_approval_deadline ?? null,
        event: 'mail_variants_notify',
        timestamp: new Date().toISOString(),
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  // Track that we mailed the client (for the activity timeline)
  await supabase
    .from('clients')
    .update({ campaign_client_mailed_at: new Date().toISOString() })
    .eq('id', clientId)

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

// --- Campaign proposals ---

export async function publishProposal(
  clientId: string,
  title: string,
  body: string
): Promise<{ error?: string }> {
  if (!title.trim()) return { error: 'Titel is verplicht' }
  if (!body.trim()) return { error: 'Beschrijving is verplicht' }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('clients')
    .update({
      campaign_proposal_title: title.trim(),
      campaign_proposal_body: body.trim(),
      campaign_proposal_published_at: now,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function clearProposal(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('clients')
    .update({
      campaign_proposal_title: null,
      campaign_proposal_body: null,
      campaign_proposal_published_at: null,
      campaign_proposal_acknowledged_at: null,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

// --- Mail variants ---

export async function addMailVariant(
  clientId: string,
  mailNumber: 1 | 2 | 3
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const [{ data: existing }, { data: client }] = await Promise.all([
    supabase
      .from('mail_variants')
      .select('position, variant_label')
      .eq('client_id', clientId)
      .eq('mail_number', mailNumber)
      .order('position', { ascending: false })
      .limit(1),
    supabase
      .from('clients')
      .select('campaign_variants_approval_requested_at')
      .eq('id', clientId)
      .single(),
  ])

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0
  const nextLetter = String.fromCharCode(65 + nextPosition) // A, B, C...

  // If the operator has already clicked "Voeg toe aan klantendashboard" earlier,
  // auto-publish new variants so they inherit that state.
  const autoPublish = !!client?.campaign_variants_approval_requested_at

  const { error } = await supabase.from('mail_variants').insert({
    client_id: clientId,
    mail_number: mailNumber,
    variant_label: `Variant ${nextLetter}`,
    subject: '',
    body: '',
    explanation: '',
    position: nextPosition,
    is_published: autoPublish,
  })

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function updateMailVariant(
  variantId: string,
  clientId: string,
  fields: { variantLabel?: string; subject?: string; body?: string; explanation?: string }
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.variantLabel !== undefined) patch.variant_label = fields.variantLabel
  if (fields.subject !== undefined) patch.subject = fields.subject
  if (fields.body !== undefined) patch.body = fields.body
  if (fields.explanation !== undefined) patch.explanation = fields.explanation

  const { error } = await supabase
    .from('mail_variants')
    .update(patch)
    .eq('id', variantId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function deleteMailVariant(
  variantId: string,
  clientId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('mail_variants').delete().eq('id', variantId)
  if (error) return { error: error.message }
  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

// --- Mail variants PDF ---

export async function uploadVariantsPdfAction(
  clientId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get('pdf') as File | null
  if (!file || file.size === 0) return { error: 'Geen bestand geselecteerd' }

  // Clean up any previous PDFs for this client first
  await deleteCampaignVariantsPdf(clientId)

  const result = await uploadCampaignVariantsPdf(clientId, file)
  if ('error' in result) return { error: result.error }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({
      campaign_variants_pdf_url: result.url,
      campaign_variants_pdf_uploaded_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}

export async function removeVariantsPdfAction(clientId: string): Promise<{ error?: string }> {
  await deleteCampaignVariantsPdf(clientId)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({
      campaign_variants_pdf_url: null,
      campaign_variants_pdf_uploaded_at: null,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  for (const p of adminPaths(clientId)) revalidatePath(p)
  return {}
}
