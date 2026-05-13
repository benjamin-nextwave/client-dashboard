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
import { getLocaleForWebhook } from '@/lib/i18n/server'

const WEBHOOK_CAMPAIGN_READY = 'https://hook.eu2.make.com/nx6392ay1en939gg5dyh718o7jcwi1wy'
const WEBHOOK_FORM_SUBMITTED = 'https://hook.eu2.make.com/3ygu3f88qqlmle9y7vkp0ilkl83kgipg'
const WEBHOOK_VARIANTS_ACKNOWLEDGED = 'https://hook.eu2.make.com/mt2w44repj3g4vz2689e5pbpis9qhovb'
const WEBHOOK_LINKEDIN_APPROVED = WEBHOOK_VARIANTS_ACKNOWLEDGED

type MailVariantFeedbackItemInput = {
  selectionText: string
  selectionStart: number
  selectionEnd: number
  actionType: 'replace_with' | 'remove' | 'other'
  feedbackText: string | null
}

export type CommitMailVariantDecision =
  | { variantId: string; type: 'approve' }
  | {
      variantId: string
      type: 'feedback'
      items: MailVariantFeedbackItemInput[]
      generalFeedback: string | null
    }

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
      .select(
        'id, mail_number, variant_label, subject, body, explanation, is_published, updated_at, client_approved_version, client_feedback_submitted_version'
      )
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
  const localeInfo = await getLocaleForWebhook()

  // Also bulk-mark every still-open published variant as approved at its
  // current version, so the per-variant status stays in sync with the
  // global acknowledgement timestamp. Variants that already have feedback
  // pending are left alone — those wait for a new operator version.
  if ((variantsRes.data ?? []).length > 0) {
    const idsToApprove = variantsRes.data!
      .filter((v) => {
        const updated = new Date(v.updated_at).getTime()
        const approvedV = (v as { client_approved_version?: string | null }).client_approved_version
        const feedbackV = (v as { client_feedback_submitted_version?: string | null }).client_feedback_submitted_version
        const alreadyApproved = approvedV && new Date(approvedV).getTime() >= updated
        const awaitingNewVersion = feedbackV && new Date(feedbackV).getTime() >= updated
        return !alreadyApproved && !awaitingNewVersion
      })
      .map((v) => v.id)

    if (idsToApprove.length > 0) {
      for (const v of variantsRes.data!) {
        if (!idsToApprove.includes(v.id)) continue
        await admin
          .from('mail_variants')
          .update({
            client_approved_at: acknowledgedAt,
            client_approved_version: v.updated_at,
          })
          .eq('id', v.id)
      }
    }
  }

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
        ...localeInfo,
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

/**
 * Approve a single mail variant. Records client_approved_at + a snapshot of
 * the variant's current updated_at so any later operator edit invalidates
 * the approval automatically. When *all* published variants for the client
 * become approved, we also bump mail_variants_last_acknowledged_at so the
 * existing campaign-completion flow keeps working.
 */
export async function approveMailVariant(
  variantId: string
): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  const { data: variant, error: fetchErr } = await admin
    .from('mail_variants')
    .select('id, client_id, updated_at, is_published')
    .eq('id', variantId)
    .single()

  if (fetchErr || !variant) return { error: 'Mailvariant niet gevonden' }
  if (variant.client_id !== clientId) return { error: 'Niet geautoriseerd' }
  if (!variant.is_published) return { error: 'Deze variant is nog niet gepubliceerd' }

  const now = new Date().toISOString()
  const { error: updErr } = await admin
    .from('mail_variants')
    .update({
      client_approved_at: now,
      client_approved_version: variant.updated_at,
    })
    .eq('id', variantId)

  if (updErr) return { error: updErr.message }

  // If every published variant for this client is now approved at its
  // current version, mark the global "variants acknowledged" timestamp too.
  const { data: allPublished } = await admin
    .from('mail_variants')
    .select('id, updated_at, client_approved_version')
    .eq('client_id', clientId)
    .eq('is_published', true)

  const everythingApproved =
    (allPublished?.length ?? 0) > 0 &&
    allPublished!.every(
      (v) =>
        v.client_approved_version &&
        new Date(v.client_approved_version).getTime() >= new Date(v.updated_at).getTime()
    )

  if (everythingApproved) {
    await admin
      .from('clients')
      .update({
        mail_variants_last_acknowledged_at: now,
        // Also flip the legacy campaign-stage flag once, for backwards
        // compatibility with the existing two-step approval workflow.
      })
      .eq('id', clientId)

    const { data: existing } = await admin
      .from('clients')
      .select('campaign_variants_approved_at')
      .eq('id', clientId)
      .single()

    if (!existing?.campaign_variants_approved_at) {
      await admin
        .from('clients')
        .update({ campaign_variants_approved_at: now })
        .eq('id', clientId)
    }
  }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

/**
 * Submit structured feedback for a single mail variant. Stores one
 * submission row plus one row per passage-level feedback item, and fires
 * the existing variants-acknowledged Make webhook with a different event
 * type so the operator gets notified.
 */
export async function submitMailVariantFeedback(input: {
  variantId: string
  items: MailVariantFeedbackItemInput[]
  generalFeedback: string | null
}): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const trimmedGeneral = (input.generalFeedback ?? '').trim()
  const hasGeneral = trimmedGeneral.length > 0
  const hasItems = input.items.length > 0
  if (!hasItems && !hasGeneral) {
    return { error: 'Voeg minstens één feedbackblok of algemene feedback toe' }
  }

  const admin = createAdminClient()

  const { data: variant, error: fetchErr } = await admin
    .from('mail_variants')
    .select(
      'id, client_id, mail_number, variant_label, subject, body, example_body, explanation, updated_at, is_published'
    )
    .eq('id', input.variantId)
    .single()

  if (fetchErr || !variant) return { error: 'Mailvariant niet gevonden' }
  if (variant.client_id !== clientId) return { error: 'Niet geautoriseerd' }
  if (!variant.is_published) return { error: 'Deze variant is nog niet gepubliceerd' }

  const now = new Date().toISOString()

  // Validate item offsets against the current body
  const bodyLen = (variant.body ?? '').length
  for (const it of input.items) {
    if (
      it.selectionStart < 0 ||
      it.selectionEnd < it.selectionStart ||
      it.selectionEnd > bodyLen
    ) {
      return { error: 'Ongeldige tekstselectie' }
    }
    if (it.actionType === 'replace_with' || it.actionType === 'other') {
      if (!it.feedbackText || it.feedbackText.trim().length === 0) {
        return { error: 'Vul feedback in voor elk geselecteerd stukje tekst' }
      }
    }
  }

  // Insert submission first to obtain the id
  const variantWithSnapshot = variant as typeof variant & { example_body?: string | null }
  const { data: submission, error: subErr } = await admin
    .from('mail_variant_feedback_submissions')
    .insert({
      mail_variant_id: variant.id,
      client_id: clientId,
      general_feedback: hasGeneral ? trimmedGeneral : null,
      variant_version: variant.updated_at,
      submitted_at: now,
      variant_subject_snapshot: variant.subject ?? '',
      variant_body_snapshot: variant.body ?? '',
      variant_example_body_snapshot: variantWithSnapshot.example_body ?? '',
      variant_label_snapshot: variant.variant_label ?? '',
      variant_explanation_snapshot: variant.explanation ?? '',
    })
    .select('id')
    .single()

  if (subErr || !submission) {
    return { error: subErr?.message ?? 'Kon feedback niet opslaan' }
  }

  if (hasItems) {
    const rows = input.items.map((it, idx) => ({
      submission_id: submission.id,
      selection_text: it.selectionText,
      selection_start: it.selectionStart,
      selection_end: it.selectionEnd,
      action_type: it.actionType,
      feedback_text: it.feedbackText ?? null,
      position: idx,
    }))
    const { error: itemsErr } = await admin
      .from('mail_variant_feedback_items')
      .insert(rows)
    if (itemsErr) {
      // Roll back the submission if items failed
      await admin.from('mail_variant_feedback_submissions').delete().eq('id', submission.id)
      return { error: itemsErr.message }
    }
  }

  // Mark variant as awaiting a new version from NextWave
  const { error: updErr } = await admin
    .from('mail_variants')
    .update({
      client_feedback_submitted_at: now,
      client_feedback_submitted_version: variant.updated_at,
    })
    .eq('id', input.variantId)

  if (updErr) return { error: updErr.message }

  // Fire webhook (best-effort; don't fail the user if Make is down)
  try {
    const [clientRes, profileRes] = await Promise.all([
      admin
        .from('clients')
        .select('id, company_name, notification_email')
        .eq('id', clientId)
        .single(),
      admin
        .from('profiles')
        .select('id')
        .eq('client_id', clientId)
        .eq('user_role', 'client')
        .single(),
    ])

    let loginEmail: string | null = null
    if (profileRes.data) {
      const { data: authUser } = await admin.auth.admin.getUserById(profileRes.data.id)
      if (authUser?.user?.email) loginEmail = authUser.user.email
    }

    const localeInfo = await getLocaleForWebhook()

    await fetch(WEBHOOK_VARIANTS_ACKNOWLEDGED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'mail_variant_feedback_submitted',
        client_id: clientId,
        client_name: clientRes.data?.company_name ?? null,
        client_email: loginEmail,
        notification_email: clientRes.data?.notification_email ?? null,
        ...localeInfo,
        submitted_at: now,
        variant: {
          id: variant.id,
          mail_number: variant.mail_number,
          variant_label: variant.variant_label,
          subject: variant.subject,
          body: variant.body,
          explanation: variant.explanation,
        },
        general_feedback: hasGeneral ? trimmedGeneral : null,
        items: input.items.map((it) => ({
          selection_text: it.selectionText,
          selection_start: it.selectionStart,
          selection_end: it.selectionEnd,
          action_type: it.actionType,
          feedback_text: it.feedbackText ?? null,
        })),
      }),
    })
  } catch (err) {
    console.error('[mail variant feedback webhook] failed:', err)
  }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

/**
 * Commit a batch of decisions (approvals + feedback submissions) for the
 * client's current round in one go. Replaces the older one-action-at-a-time
 * flow on the client side: the modal collects every variant's decision
 * locally and only persists them when the user clicks "Bevestigen".
 *
 * Each open published variant must be represented in `decisions`. Variants
 * already in approved/feedback_pending state on the current version are
 * left alone — the caller should not include them.
 */
export async function commitMailVariantDecisions(input: {
  decisions: CommitMailVariantDecision[]
}): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }
  if (input.decisions.length === 0) return { error: 'Geen keuzes om in te dienen' }

  const admin = createAdminClient()

  // Fetch every variant referenced in the batch so we can validate ownership
  // + grab the current updated_at for the version snapshots.
  const variantIds = input.decisions.map((d) => d.variantId)
  const { data: variants, error: fetchErr } = await admin
    .from('mail_variants')
    .select(
      'id, client_id, mail_number, variant_label, subject, body, example_body, explanation, is_published, updated_at'
    )
    .in('id', variantIds)

  if (fetchErr || !variants) return { error: 'Kon mailvarianten niet laden' }
  if (variants.length !== variantIds.length) return { error: 'Niet alle varianten zijn beschikbaar' }
  for (const v of variants) {
    if (v.client_id !== clientId) return { error: 'Niet geautoriseerd' }
    if (!v.is_published) return { error: 'Een variant is niet gepubliceerd' }
  }

  const variantById = new Map(variants.map((v) => [v.id, v]))
  const now = new Date().toISOString()

  // Pre-validate every feedback decision before we touch the database.
  for (const d of input.decisions) {
    if (d.type !== 'feedback') continue
    const v = variantById.get(d.variantId)!
    const bodyLen = (v.body ?? '').length
    const hasGeneral = (d.generalFeedback ?? '').trim().length > 0
    if (d.items.length === 0 && !hasGeneral) {
      return { error: `Variant "${v.variant_label}" mist feedback inhoud` }
    }
    for (const it of d.items) {
      if (
        it.selectionStart < 0 ||
        it.selectionEnd < it.selectionStart ||
        it.selectionEnd > bodyLen
      ) {
        return { error: `Ongeldige selectie in "${v.variant_label}"` }
      }
      if (it.actionType === 'replace_with' || it.actionType === 'other') {
        if (!it.feedbackText || it.feedbackText.trim().length === 0) {
          return { error: `Vul feedback in bij elk geselecteerd stuk tekst in "${v.variant_label}"` }
        }
      }
    }
  }

  // Apply each decision sequentially. We accept partial-progress on failure
  // (return the first error) rather than implementing a full rollback —
  // each row stands on its own and operator can retry.
  for (const d of input.decisions) {
    const v = variantById.get(d.variantId)!
    if (d.type === 'approve') {
      const { error } = await admin
        .from('mail_variants')
        .update({
          client_approved_at: now,
          client_approved_version: v.updated_at,
        })
        .eq('id', v.id)
      if (error) return { error: error.message }
    } else {
      const trimmedGeneral = (d.generalFeedback ?? '').trim()
      const variantWithSnapshot = v as typeof v & { example_body?: string | null }
      const { data: submission, error: subErr } = await admin
        .from('mail_variant_feedback_submissions')
        .insert({
          mail_variant_id: v.id,
          client_id: clientId,
          general_feedback: trimmedGeneral.length > 0 ? trimmedGeneral : null,
          variant_version: v.updated_at,
          submitted_at: now,
          variant_subject_snapshot: v.subject ?? '',
          variant_body_snapshot: v.body ?? '',
          variant_example_body_snapshot: variantWithSnapshot.example_body ?? '',
          variant_label_snapshot: v.variant_label ?? '',
          variant_explanation_snapshot: v.explanation ?? '',
        })
        .select('id')
        .single()
      if (subErr || !submission) return { error: subErr?.message ?? 'Kon feedback niet opslaan' }

      if (d.items.length > 0) {
        const rows = d.items.map((it, idx) => ({
          submission_id: submission.id,
          selection_text: it.selectionText,
          selection_start: it.selectionStart,
          selection_end: it.selectionEnd,
          action_type: it.actionType,
          feedback_text: it.feedbackText ?? null,
          position: idx,
        }))
        const { error: itemsErr } = await admin
          .from('mail_variant_feedback_items')
          .insert(rows)
        if (itemsErr) {
          await admin
            .from('mail_variant_feedback_submissions')
            .delete()
            .eq('id', submission.id)
          return { error: itemsErr.message }
        }
      }

      const { error: updErr } = await admin
        .from('mail_variants')
        .update({
          client_feedback_submitted_at: now,
          client_feedback_submitted_version: v.updated_at,
        })
        .eq('id', v.id)
      if (updErr) return { error: updErr.message }
    }
  }

  // After applying, check if every published variant for this client is now
  // either approved-at-current-version or feedback-submitted-at-current-version.
  // If so, mark the global "variants acknowledged" timestamp + legacy flag —
  // this keeps the campaign-completion flow working unchanged.
  const { data: allPublished } = await admin
    .from('mail_variants')
    .select('updated_at, client_approved_version, client_feedback_submitted_version')
    .eq('client_id', clientId)
    .eq('is_published', true)

  const allHandled =
    (allPublished?.length ?? 0) > 0 &&
    allPublished!.every((v) => {
      const updated = new Date(v.updated_at).getTime()
      const approvedV = v.client_approved_version
        ? new Date(v.client_approved_version).getTime()
        : 0
      const feedbackV = v.client_feedback_submitted_version
        ? new Date(v.client_feedback_submitted_version).getTime()
        : 0
      return approvedV >= updated || feedbackV >= updated
    })

  if (allHandled) {
    await admin
      .from('clients')
      .update({ mail_variants_last_acknowledged_at: now })
      .eq('id', clientId)

    const { data: existing } = await admin
      .from('clients')
      .select('campaign_variants_approved_at')
      .eq('id', clientId)
      .single()
    if (!existing?.campaign_variants_approved_at) {
      await admin
        .from('clients')
        .update({ campaign_variants_approved_at: now })
        .eq('id', clientId)
    }
  }

  // Single webhook with the whole round
  try {
    const [clientRes, profileRes] = await Promise.all([
      admin
        .from('clients')
        .select('id, company_name, notification_email')
        .eq('id', clientId)
        .single(),
      admin
        .from('profiles')
        .select('id')
        .eq('client_id', clientId)
        .eq('user_role', 'client')
        .single(),
    ])
    let loginEmail: string | null = null
    if (profileRes.data) {
      const { data: authUser } = await admin.auth.admin.getUserById(profileRes.data.id)
      if (authUser?.user?.email) loginEmail = authUser.user.email
    }
    const localeInfo = await getLocaleForWebhook()

    const summary = input.decisions.map((d) => {
      const v = variantById.get(d.variantId)!
      if (d.type === 'approve') {
        return {
          variant_id: v.id,
          mail_number: v.mail_number,
          variant_label: v.variant_label,
          decision: 'approved' as const,
        }
      }
      return {
        variant_id: v.id,
        mail_number: v.mail_number,
        variant_label: v.variant_label,
        decision: 'feedback' as const,
        general_feedback: (d.generalFeedback ?? '').trim() || null,
        items: d.items.map((it) => ({
          selection_text: it.selectionText,
          selection_start: it.selectionStart,
          selection_end: it.selectionEnd,
          action_type: it.actionType,
          feedback_text: it.feedbackText ?? null,
        })),
      }
    })

    await fetch(WEBHOOK_VARIANTS_ACKNOWLEDGED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'mail_variants_decision_round',
        client_id: clientId,
        client_name: clientRes.data?.company_name ?? null,
        client_email: loginEmail,
        notification_email: clientRes.data?.notification_email ?? null,
        ...localeInfo,
        submitted_at: now,
        all_variants_handled: allHandled,
        decisions: summary,
      }),
    })
  } catch (err) {
    console.error('[commit decisions webhook] failed:', err)
  }

  revalidatePath('/dashboard/mijn-campagne')
  return {}
}

export async function acknowledgeProposal(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, company_name, notification_email, campaign_proposal_title, campaign_proposal_body')
    .eq('id', clientId)
    .single()

  if (!client) return { error: 'Klant niet gevonden' }

  let loginEmail: string | null = null
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) loginEmail = authUser.user.email
  }

  const acknowledgedAt = new Date().toISOString()
  const localeInfo = await getLocaleForWebhook()

  try {
    const res = await fetch(WEBHOOK_VARIANTS_ACKNOWLEDGED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'campaign_proposal_acknowledged',
        client_id: client.id,
        client_name: client.company_name,
        client_email: loginEmail,
        notification_email: client.notification_email ?? null,
        ...localeInfo,
        proposal_title: client.campaign_proposal_title,
        proposal_body: client.campaign_proposal_body,
        acknowledged_at: acknowledgedAt,
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  const { error } = await admin
    .from('clients')
    .update({ campaign_proposal_acknowledged_at: acknowledgedAt })
    .eq('id', clientId)

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

/**
 * Client approves the published LinkedIn flow. One-shot global approval —
 * mirrors `approveVariants` for the email flow but with a single timestamp.
 * Bumping the timestamp closes the "needs approval" state in the read-only
 * block; later operator edits + re-publish will reopen it.
 */
export async function approveLinkedInFlow(): Promise<{ error?: string }> {
  const clientId = await getClientIdForCurrentUser()
  if (!clientId) return { error: 'Niet geautoriseerd' }

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select(
      'id, company_name, notification_email, linkedin_flow_enabled, linkedin_flow_published_at, linkedin_message_day_plus_1, linkedin_message_day_plus_4, linkedin_message_day_plus_9, linkedin_message_day_plus_14'
    )
    .eq('id', clientId)
    .single()

  if (!client) return { error: 'Klant niet gevonden' }
  if (!client.linkedin_flow_enabled || !client.linkedin_flow_published_at) {
    return { error: 'LinkedIn-flow is nog niet gepubliceerd' }
  }

  const approvedAt = new Date().toISOString()

  const { error } = await admin
    .from('clients')
    .update({ linkedin_flow_approved_at: approvedAt })
    .eq('id', clientId)

  if (error) return { error: error.message }

  // Best-effort webhook; not fatal if Make is down.
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_role', 'client')
      .single()

    let loginEmail: string | null = null
    if (profile) {
      const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
      if (authUser?.user?.email) loginEmail = authUser.user.email
    }

    const localeInfo = await getLocaleForWebhook()

    await fetch(WEBHOOK_LINKEDIN_APPROVED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'linkedin_flow_approved',
        client_id: client.id,
        client_name: client.company_name,
        client_email: loginEmail,
        notification_email: client.notification_email ?? null,
        ...localeInfo,
        approved_at: approvedAt,
        published_at: client.linkedin_flow_published_at,
        messages: {
          day_plus_1: client.linkedin_message_day_plus_1 ?? '',
          day_plus_4: client.linkedin_message_day_plus_4 ?? '',
          day_plus_9: client.linkedin_message_day_plus_9 ?? '',
          day_plus_14: client.linkedin_message_day_plus_14 ?? '',
        },
      }),
    })
  } catch (err) {
    console.error('[linkedin flow approved webhook] failed:', err)
  }

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
  const localeInfo = await getLocaleForWebhook()

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
    ...localeInfo,
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
  const localeInfo = await getLocaleForWebhook()

  // Fire webhook first; if it fails, don't lock the state
  try {
    const res = await fetch(WEBHOOK_CAMPAIGN_READY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: client.id,
        client_name: client.company_name,
        ...localeInfo,
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
