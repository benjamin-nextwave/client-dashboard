import { createAdminClient } from './admin'

const LOGO_BUCKET = 'client-logos'
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
]

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/svg+xml': 'svg',
    'image/webp': 'webp',
  }
  return map[mimeType] || 'png'
}

export async function uploadClientLogo(
  clientId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: `Ongeldig bestandstype: ${file.type}. Toegestaan: PNG, JPEG, SVG, WebP.` }
  }

  if (file.size > MAX_LOGO_SIZE) {
    return { error: 'Bestand is te groot. Maximaal 2MB.' }
  }

  const ext = getExtension(file.type)
  const path = `${clientId}/logo.${ext}`

  const supabase = createAdminClient()

  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    })

  if (error) {
    return { error: `Upload mislukt: ${error.message}` }
  }

  const { data: publicUrlData } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(path)

  return { url: publicUrlData.publicUrl }
}

export async function deleteClientLogo(clientId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: files } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(clientId)

  if (files && files.length > 0) {
    const filePaths = files.map((f) => `${clientId}/${f.name}`)
    await supabase.storage.from(LOGO_BUCKET).remove(filePaths)
  }
}

// --- Campaign variants PDF ---

const CAMPAIGN_PDF_BUCKET = 'campaign-pdfs'
const MAX_PDF_SIZE = 20 * 1024 * 1024 // 20MB

export async function uploadCampaignVariantsPdf(
  clientId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  if (file.type !== 'application/pdf') {
    return { error: `Alleen PDF bestanden toegestaan (ontvangen: ${file.type || 'onbekend'}).` }
  }
  if (file.size > MAX_PDF_SIZE) {
    return { error: 'Bestand is te groot. Maximaal 20MB.' }
  }

  // Unique filename to bust browser/CDN cache on replace
  const path = `${clientId}/mailvarianten-${Date.now()}.pdf`

  const supabase = createAdminClient()

  const { error } = await supabase.storage
    .from(CAMPAIGN_PDF_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: 'application/pdf',
    })

  if (error) {
    return { error: `Upload mislukt: ${error.message}` }
  }

  const { data } = supabase.storage.from(CAMPAIGN_PDF_BUCKET).getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function deleteCampaignVariantsPdf(clientId: string): Promise<void> {
  const supabase = createAdminClient()
  const { data: files } = await supabase.storage
    .from(CAMPAIGN_PDF_BUCKET)
    .list(clientId)
  if (files && files.length > 0) {
    const paths = files.map((f) => `${clientId}/${f.name}`)
    await supabase.storage.from(CAMPAIGN_PDF_BUCKET).remove(paths)
  }
}
