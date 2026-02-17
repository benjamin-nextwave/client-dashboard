import { createClient } from '@/lib/supabase/server'
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

// --- Exported query functions ---

/**
 * Get all not_yet_emailed contacts for the preview view.
 * Excludes contacts the client has removed (is_excluded = true).
 * Deduplicates by email (keeps most recently updated per email).
 */
export async function getPreviewContacts(
  clientId: string
): Promise<PreviewContact[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('synced_leads')
    .select(
      'id, email, first_name, last_name, company_name, job_title, industry, updated_at'
    )
    .eq('client_id', clientId)
    .eq('lead_status', 'not_yet_emailed')
    .eq('is_excluded', false)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch preview contacts: ${error.message}`)
  }

  if (!data || data.length === 0) return []

  // Deduplicate: keep first occurrence per email (most recent due to ordering)
  const seen = new Set<string>()
  const contacts: PreviewContact[] = []

  for (const row of data) {
    if (!seen.has(row.email)) {
      seen.add(row.email)
      contacts.push({
        id: row.id,
        fullName:
          [row.first_name, row.last_name].filter(Boolean).join(' ') ||
          row.email,
        companyName: row.company_name,
        jobTitle: row.job_title,
        industry: row.industry,
        email: row.email,
        updatedAt: row.updated_at,
      })
    }
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
