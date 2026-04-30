'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { newsDraftSchema, newsPublishSchema } from '@/lib/validations/news'
import { uploadNewsImage, deleteNewsImage } from '@/lib/supabase/storage'

type ActionState = { error: string }
type RawNewsForm = {
  title_nl: string
  title_en: string
  title_hi: string
  body_nl: string
  body_en: string
  body_hi: string
}

function readRawFromFormData(formData: FormData): RawNewsForm {
  // The form sends the 6 language text fields plus an `image` File (read separately
  // in each action via formData.get('image')). It does NOT send `image_path` — that
  // column is server-managed via the uploadNewsImage flow.
  return {
    title_nl: (formData.get('title_nl') as string) ?? '',
    title_en: (formData.get('title_en') as string) ?? '',
    title_hi: (formData.get('title_hi') as string) ?? '',
    body_nl: (formData.get('body_nl') as string) ?? '',
    body_en: (formData.get('body_en') as string) ?? '',
    body_hi: (formData.get('body_hi') as string) ?? '',
  }
}

async function getOperatorProfileId(): Promise<string | null> {
  // Operator routes already enforce auth via the (operator) layout — read the
  // current operator's profile id to stamp `created_by`.
  // Pattern: createAdminClient() with auth.getUser() doesn't apply here (admin
  // client is service-role). Use the request-scoped server client.
  // For Phase 9, we delegate to a request-scoped helper if it exists; if not,
  // we accept a NULL created_by (D-08 column is nullable via ON DELETE SET NULL).
  return null
}

// =============================================================================
// CREATE — inserts a new draft (status='draft') with all 6 lang fields persisted
// =============================================================================
export async function createNewsItem(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = readRawFromFormData(formData)

  const result = newsDraftSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const supabase = createAdminClient()
  const createdBy = await getOperatorProfileId()

  // Step 1: insert the news_items row with status='draft' and image_path=null.
  // image_path is ALWAYS null at insert time. If an image is uploaded below,
  // a follow-up UPDATE patches it with the bucket-relative path.
  const { data: newRow, error: insertError } = await supabase
    .from('news_items')
    .insert({
      title_nl: result.data.title_nl,
      title_en: result.data.title_en,
      title_hi: result.data.title_hi,
      body_nl: result.data.body_nl,
      body_en: result.data.body_en,
      body_hi: result.data.body_hi,
      status: 'draft',
      image_path: null,
      created_by: createdBy,
    })
    .select('id')
    .single()

  if (insertError || !newRow) {
    return { error: `Aanmaken mislukt: ${insertError?.message ?? 'onbekende fout'}` }
  }

  // Step 2: optional image upload (non-fatal — matches createClient pattern)
  const image = formData.get('image') as File | null
  if (image && image.size > 0) {
    const uploadResult = await uploadNewsImage(newRow.id, image)
    if ('error' in uploadResult) {
      console.warn(`News image upload mislukt voor item ${newRow.id}: ${uploadResult.error}`)
    } else {
      await supabase
        .from('news_items')
        .update({ image_path: uploadResult.path })
        .eq('id', newRow.id)
    }
  }

  revalidatePath('/admin/news')
  redirect(`/admin/news/${newRow.id}/edit`)
}

// =============================================================================
// UPDATE — mutates the targeted row's content fields ONLY (never status/timestamps)
// =============================================================================
export async function updateNewsItem(
  newsItemId: string,
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = readRawFromFormData(formData)

  const result = newsDraftSchema.safeParse(raw)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const supabase = createAdminClient()

  // Update content fields ONLY. Do NOT touch status, published_at, withdrawn_at,
  // created_at, created_by, image_path — those are managed by publish/withdraw
  // and the upload flow below.
  const { error: updateError } = await supabase
    .from('news_items')
    .update({
      title_nl: result.data.title_nl,
      title_en: result.data.title_en,
      title_hi: result.data.title_hi,
      body_nl: result.data.body_nl,
      body_en: result.data.body_en,
      body_hi: result.data.body_hi,
    })
    .eq('id', newsItemId)

  if (updateError) {
    return { error: `Bijwerken mislukt: ${updateError.message}` }
  }

  // Optional image replace — server-managed image_path
  const image = formData.get('image') as File | null
  if (image && image.size > 0) {
    const uploadResult = await uploadNewsImage(newsItemId, image)
    if ('error' in uploadResult) {
      console.warn(`News image upload mislukt voor item ${newsItemId}: ${uploadResult.error}`)
    } else {
      await supabase
        .from('news_items')
        .update({ image_path: uploadResult.path })
        .eq('id', newsItemId)
    }
  }

  revalidatePath('/admin/news')
  revalidatePath(`/admin/news/${newsItemId}/edit`)
  return { error: '' }
}

// =============================================================================
// PUBLISH — transitions draft → published, gated by all-6-fields-required
// =============================================================================
export async function publishNewsItem(
  newsItemId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Step 1: Read current row to validate against newsPublishSchema.
  const { data: row, error: readError } = await supabase
    .from('news_items')
    .select('title_nl, title_en, title_hi, body_nl, body_en, body_hi, status')
    .eq('id', newsItemId)
    .single()

  if (readError || !row) {
    return { error: `Nieuwsbericht niet gevonden: ${readError?.message ?? 'onbekend'}` }
  }

  // Only drafts can be published. (Republishing a withdrawn item is a Phase-10/v1.2 flow.)
  if (row.status !== 'draft') {
    return { error: `Alleen concepten kunnen worden gepubliceerd (status: ${row.status}).` }
  }

  // Step 2: Validate against publish gate.
  const parseResult = newsPublishSchema.safeParse({
    title_nl: row.title_nl,
    title_en: row.title_en,
    title_hi: row.title_hi,
    body_nl: row.body_nl,
    body_en: row.body_en,
    body_hi: row.body_hi,
  })

  if (!parseResult.success) {
    // The refine() error has path: ['_publishGate'] and message in Dutch.
    const message = parseResult.error.errors.find((e) => e.path[0] === '_publishGate')?.message
      ?? parseResult.error.errors[0].message
    return { error: message }
  }

  // Step 3: Transition status.
  const { error: updateError } = await supabase
    .from('news_items')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', newsItemId)

  if (updateError) {
    return { error: `Publiceren mislukt: ${updateError.message}` }
  }

  revalidatePath('/admin/news')
  revalidatePath(`/admin/news/${newsItemId}/edit`)
  return {}
}

// =============================================================================
// WITHDRAW — transitions published → withdrawn (soft delete)
// =============================================================================
export async function withdrawNewsItem(
  newsItemId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Read current status — only published items can be withdrawn.
  const { data: row, error: readError } = await supabase
    .from('news_items')
    .select('status')
    .eq('id', newsItemId)
    .single()

  if (readError || !row) {
    return { error: `Nieuwsbericht niet gevonden: ${readError?.message ?? 'onbekend'}` }
  }

  if (row.status !== 'published') {
    return { error: `Alleen gepubliceerde items kunnen worden ingetrokken (status: ${row.status}).` }
  }

  const { error: updateError } = await supabase
    .from('news_items')
    .update({ status: 'withdrawn', withdrawn_at: new Date().toISOString() })
    .eq('id', newsItemId)

  if (updateError) {
    return { error: `Intrekken mislukt: ${updateError.message}` }
  }

  revalidatePath('/admin/news')
  revalidatePath(`/admin/news/${newsItemId}/edit`)
  return {}
}

// =============================================================================
// DELETE — hard delete (admin only — list view exposes this for drafts)
// =============================================================================
export async function deleteNewsItem(
  newsItemId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Step 1: best-effort delete of any image objects in storage (non-fatal).
  try {
    await deleteNewsImage(newsItemId)
  } catch (e) {
    console.warn(`News image delete mislukt voor item ${newsItemId}`, e)
  }

  // Step 2: delete the row. ON DELETE CASCADE on news_dismissals cleans up dismissals.
  const { error: deleteError } = await supabase
    .from('news_items')
    .delete()
    .eq('id', newsItemId)

  if (deleteError) {
    return { error: `Verwijderen mislukt: ${deleteError.message}` }
  }

  revalidatePath('/admin/news')
  return {}
}
