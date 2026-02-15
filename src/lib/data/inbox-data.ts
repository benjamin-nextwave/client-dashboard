import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEmails } from '@/lib/instantly/client'

// --- Types ---

interface InboxLead {
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
}

interface CachedEmail {
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

// Cache freshness threshold: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000

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
      'id, email, first_name, last_name, company_name, job_title, linkedin_url, vacancy_url, sender_account, updated_at, reply_subject, reply_content, client_has_replied'
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
      })
    }
  }

  return leads
}

/**
 * Get email thread for a specific lead.
 * Uses cached_emails as a 5-minute cache layer over the Instantly API.
 * On cache miss or stale cache, fetches from Instantly and caches results.
 */
export async function getLeadThread(
  clientId: string,
  leadEmail: string
): Promise<CachedEmail[]> {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Check cache first
  const { data: cached, error: cacheError } = await supabase
    .from('cached_emails')
    .select('*')
    .eq('client_id', clientId)
    .eq('lead_email', leadEmail)
    .order('email_timestamp', { ascending: true })

  if (cacheError) {
    console.error('Failed to check email cache:', cacheError.message)
  }

  // If cache exists and is fresh, return it
  if (cached && cached.length > 0) {
    const mostRecent = cached.reduce((latest, email) =>
      new Date(email.created_at) > new Date(latest.created_at) ? email : latest
    )
    const cacheAge = Date.now() - new Date(mostRecent.created_at).getTime()

    if (cacheAge < CACHE_TTL_MS) {
      return cached
    }
  }

  // Cache miss or stale - fetch from Instantly API
  const { data: senderData } = await supabase
    .from('synced_leads')
    .select('sender_account')
    .eq('client_id', clientId)
    .eq('email', leadEmail)
    .not('sender_account', 'is', null)
    .limit(1)

  const senderAccounts = new Set(
    (senderData ?? [])
      .map((row) => row.sender_account)
      .filter((s): s is string => s != null)
  )

  // Fetch emails from Instantly
  const response = await listEmails({
    lead: leadEmail,
    sortOrder: 'asc',
    limit: 100,
  })

  const emails = response.items

  if (emails.length > 0) {
    // Cache results using admin client (bypasses RLS for INSERT)
    const cacheRows = emails.map((email) => ({
      client_id: clientId,
      instantly_email_id: email.id,
      thread_id: email.thread_id,
      lead_email: leadEmail,
      from_address: email.from_address_email,
      to_address: email.to_address_email_list,
      subject: email.subject,
      body_text: email.body?.text ?? null,
      body_html: email.body?.html ?? null,
      is_reply: email.is_reply,
      sender_account: senderAccounts.has(email.from_address_email)
        ? email.from_address_email
        : null,
      email_timestamp: email.timestamp_email ?? email.timestamp_created,
    }))

    const { error: upsertError } = await admin
      .from('cached_emails')
      .upsert(cacheRows, { onConflict: 'instantly_email_id' })

    if (upsertError) {
      console.error('Failed to cache emails:', upsertError.message)
    }

    // Check if client has replied (any email from a non-sender-account address)
    const clientReplied = emails.some(
      (email) =>
        !senderAccounts.has(email.from_address_email) &&
        email.from_address_email !== leadEmail
    )

    if (clientReplied) {
      const { error: updateError } = await admin
        .from('synced_leads')
        .update({ client_has_replied: true })
        .eq('client_id', clientId)
        .eq('email', leadEmail)

      if (updateError) {
        console.error(
          'Failed to update client_has_replied:',
          updateError.message
        )
      }
    }
  }

  // Return fresh data from cache
  const { data: freshCached } = await supabase
    .from('cached_emails')
    .select('*')
    .eq('client_id', clientId)
    .eq('lead_email', leadEmail)
    .order('email_timestamp', { ascending: true })

  return freshCached ?? []
}
