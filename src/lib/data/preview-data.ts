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
  isExcluded: boolean
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
 * Get all contacts from the most recent CSV upload for the preview view.
 * Finds the latest upload that actually has rows, regardless of status or expiry.
 */
export async function getPreviewContacts(
  clientId: string
): Promise<PreviewContact[]> {
  const supabase = createAdminClient()

  // Find the most recent CSV upload for this client (any status, ignore expiry)
  const { data: uploads } = await supabase
    .from('csv_uploads')
    .select('id, email_column, column_mappings, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (!uploads || uploads.length === 0) return []

  // Try each upload until we find one with rows
  for (const upload of uploads) {
    const emailColumn = upload.email_column
    const mappings = (upload.column_mappings as Record<string, string> | null) ?? null

    // Fetch ALL rows for this upload (ignore is_filtered)
    const { data: rows, error: rowsError } = await supabase
      .from('csv_rows')
      .select('id, data, is_filtered, filter_reason')
      .eq('upload_id', upload.id)
      .order('row_index', { ascending: true })
      .limit(5000)

    if (rowsError || !rows || rows.length === 0) continue

    const contacts: PreviewContact[] = []

    for (const row of rows) {
      const data = row.data as Record<string, string>

      const email = emailColumn
        ? data[emailColumn]?.trim() ?? null
        : extractField(data, ['email', 'Email', 'E-mail', 'e-mail'])

      if (!email) continue

      let fullName: string
      let companyName: string | null
      let jobTitle: string | null
      let industry: string | null

      if (mappings) {
        fullName = (mappings.full_name && data[mappings.full_name]?.trim()) || email
        companyName = (mappings.company_name && data[mappings.company_name]?.trim()) || null
        industry = (mappings.industry && data[mappings.industry]?.trim()) || null
        jobTitle = (mappings.job_title && data[mappings.job_title]?.trim()) || null
      } else {
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
        updatedAt: upload.created_at,
        isExcluded: !!(row.is_filtered && row.filter_reason === 'client_excluded'),
      })
    }

    if (contacts.length > 0) return contacts
  }

  return []
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
