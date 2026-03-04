import { createClient } from '@/lib/supabase/server'

// --- Types ---

export interface InboxLead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  job_title: string | null
  linkedin_url: string | null
  vacancy_url: string | null
  sender_account: string | null
  reply_date: string | null
  reply_subject: string | null
  reply_content: string | null
  client_has_replied: boolean
  opened_at: string | null
  archived_at: string | null
}

export interface CachedEmail {
  id: string
  instantly_email_id: string
  thread_id: string
  lead_email: string
  from_address: string
  to_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  is_reply: boolean
  sender_account: string | null
  email_timestamp: string | null
  created_at: string
}

// --- Exported query functions ---

/**
 * Get all positive leads for the inbox view.
 * Deduplicates by email (keeps most recently updated per email).
 * Returns leads ordered by updated_at descending.
 */
export async function getPositiveLeadsForInbox(
  clientId: string
): Promise<InboxLead[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('synced_leads')
    .select(
      'id, email, first_name, last_name, company_name, job_title, linkedin_url, vacancy_url, sender_account, updated_at, reply_subject, reply_content, client_has_replied, opened_at, archived_at'
    )
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch positive leads: ${error.message}`)
  }

  if (!data || data.length === 0) return []

  // Deduplicate: keep first occurrence per email (most recent due to ordering)
  const seen = new Set<string>()
  const leads: InboxLead[] = []

  for (const row of data) {
    if (!seen.has(row.email)) {
      seen.add(row.email)
      leads.push({
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        company_name: row.company_name,
        job_title: row.job_title,
        linkedin_url: row.linkedin_url,
        vacancy_url: row.vacancy_url,
        sender_account: row.sender_account,
        reply_date: row.updated_at,
        reply_subject: row.reply_subject,
        reply_content: row.reply_content,
        client_has_replied: row.client_has_replied ?? false,
        opened_at: row.opened_at ?? null,
        archived_at: row.archived_at ?? null,
      })
    }
  }

  // Fetch the actual email timestamps from cached_emails so the inbox shows
  // when the latest email was sent, not when the lead was last synced.
  const leadEmails = leads.map((l) => l.email)
  const { data: emailRows } = await supabase
    .from('cached_emails')
    .select('lead_email, email_timestamp')
    .eq('client_id', clientId)
    .in('lead_email', leadEmails)
    .order('email_timestamp', { ascending: false })

  if (emailRows && emailRows.length > 0) {
    // Build a map: lead_email → latest email_timestamp
    const latestTimestamp = new Map<string, string>()
    for (const row of emailRows) {
      if (row.email_timestamp && !latestTimestamp.has(row.lead_email)) {
        latestTimestamp.set(row.lead_email, row.email_timestamp)
      }
    }
    // Override reply_date with the real email timestamp
    for (const lead of leads) {
      const ts = latestTimestamp.get(lead.email)
      if (ts) lead.reply_date = ts
    }
  }

  // Sort by reply_date descending so the most recent email appears first
  leads.sort((a, b) => {
    if (!a.reply_date) return 1
    if (!b.reply_date) return -1
    return new Date(b.reply_date).getTime() - new Date(a.reply_date).getTime()
  })

  return leads
}

/**
 * Get email thread for a specific lead.
 * Reads directly from cached_emails in Supabase — no live Instantly API calls.
 * The sync process (cron + webhook + manual refresh) keeps this data fresh.
 *
 * When senderAccount is provided, only emails belonging to threads that involve
 * that sender are returned. This prevents mixing emails from different campaigns
 * when the same lead email appears in multiple campaigns.
 */
export async function getLeadThread(
  clientId: string,
  leadEmail: string,
  senderAccount?: string | null
): Promise<CachedEmail[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cached_emails')
    .select('*')
    .eq('client_id', clientId)
    .eq('lead_email', leadEmail)
    .order('email_timestamp', { ascending: true })

  if (error) {
    console.error('Failed to fetch email thread:', error.message)
    return []
  }

  if (!data || data.length === 0) return []

  // When we know the sender account, keep only emails that directly involve
  // that sender. This filters out sent emails from other campaigns/clients.
  // - Outbound emails: from_address matches the sender account
  // - Lead replies: to_address contains the sender account
  if (senderAccount) {
    const sa = senderAccount.toLowerCase()
    const filtered = data.filter(
      (e) =>
        e.from_address?.toLowerCase() === sa ||
        e.to_address?.toLowerCase().includes(sa)
    )

    if (filtered.length > 0) return filtered
  }

  return data
}
