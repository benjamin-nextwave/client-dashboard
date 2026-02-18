import { createAdminClient } from '@/lib/supabase/admin'

// --- Types ---

export interface PreviewContact {
  id: string
  fullName: string
  companyName: string | null
  jobTitle: string | null
  industry: string | null
  email: string
  updatedAt: string
}

// --- Helpers ---

/**
 * Extract a value from a CSV row's data object using case-insensitive key matching.
 */
function extractField(
  data: Record<string, string>,
  variants: string[]
): string | null {
  for (const variant of variants) {
    const key = Object.keys(data).find(
      (k) => k.toLowerCase() === variant.toLowerCase()
    )
    if (key && data[key] != null && data[key].trim() !== '') {
      return data[key].trim()
    }
  }
  return null
}

// --- Exported query functions ---

/**
 * Get all non-filtered contacts from the most recent CSV upload for the preview view.
 * Deduplicates by email (keeps first occurrence).
 */
export async function getPreviewContacts(
  clientId: string
): Promise<PreviewContact[]> {
  const supabase = createAdminClient()

  // Find the most recent non-expired CSV upload that is ready or filtered
  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .select('id, email_column, column_mappings, created_at')
    .eq('client_id', clientId)
    .in('status', ['ready', 'filtered'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (uploadError || !upload) return []

  const emailColumn = upload.email_column
  const mappings = (upload.column_mappings as Record<string, string> | null) ?? null

  // Fetch all non-filtered rows for this upload
  const { data: rows, error: rowsError } = await supabase
    .from('csv_rows')
    .select('id, data')
    .eq('upload_id', upload.id)
    .eq('is_filtered', false)
    .order('row_index', { ascending: true })

  if (rowsError) {
    throw new Error(`Failed to fetch preview contacts: ${rowsError.message}`)
  }

  if (!rows || rows.length === 0) return []

  const uploadDate = upload.created_at

  const contacts: PreviewContact[] = []

  for (const row of rows) {
    const data = row.data as Record<string, string>

    // Extract email using the upload's configured email column, fallback to common variants
    const email = emailColumn
      ? data[emailColumn]?.trim() ?? null
      : extractField(data, ['email', 'Email', 'E-mail', 'e-mail'])

    if (!email) continue

    let fullName: string
    let companyName: string | null
    let jobTitle: string | null
    let industry: string | null

    if (mappings) {
      // Use explicit column mappings
      fullName = (mappings.full_name && data[mappings.full_name]?.trim()) || email
      companyName = (mappings.company_name && data[mappings.company_name]?.trim()) || null
      industry = (mappings.industry && data[mappings.industry]?.trim()) || null
      jobTitle = (mappings.job_title && data[mappings.job_title]?.trim()) || null
    } else {
      // Fallback: guess columns for older uploads without mappings
      const firstName = extractField(data, [
        'First Name', 'first_name', 'FirstName', 'Voornaam', 'voornaam',
      ])
      const lastName = extractField(data, [
        'Last Name', 'last_name', 'LastName', 'Achternaam', 'achternaam',
      ])
      const fullNameDirect = extractField(data, ['Name', 'Naam', 'name', 'naam', 'Full Name', 'full_name'])

      fullName =
        [firstName, lastName].filter(Boolean).join(' ') ||
        fullNameDirect ||
        email
      companyName = extractField(data, [
        'Company', 'company_name', 'Company Name', 'Bedrijf', 'Bedrijfsnaam',
        'bedrijf', 'bedrijfsnaam', 'company',
      ])
      jobTitle = extractField(data, [
        'Job Title', 'job_title', 'Functie', 'functie', 'Title', 'title',
      ])
      industry = extractField(data, [
        'Industry', 'industry', 'Branche', 'branche', 'Sector', 'sector',
      ])
    }

    contacts.push({
      id: row.id,
      fullName,
      companyName,
      jobTitle,
      industry,
      email,
      updatedAt: uploadDate,
    })
  }

  return contacts
}

/**
 * Get the most recent contact date from CSV uploads for this client.
 */
export async function getContactDate(
  clientId: string
): Promise<string | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('csv_uploads')
    .select('contact_date')
    .eq('client_id', clientId)
    .not('contact_date', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  return data?.[0]?.contact_date ?? null
}
