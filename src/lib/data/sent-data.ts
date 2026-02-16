import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEmails } from '@/lib/instantly/client'

// --- Types ---

export interface SentEmail {
  id: string
  toAddress: string
  fromAddress: string
  subject: string | null
  previewText: string | null
  sentAt: string | null
}

export interface SentEmailDetail extends SentEmail {
  bodyHtml: string | null
  bodyText: string | null
}

// --- Exported query functions ---

/**
 * Get all sent (outbound) emails for a client.
 * Outbound emails are identified by having sender_account IS NOT NULL in cached_emails.
 * If cache is empty, populates it from Instantly API via client campaigns.
 */
export async function getSentEmails(
  clientId: string
): Promise<SentEmail[]> {
  const supabase = await createClient()

  // Query cached outbound campaign emails (sender_account IS NOT NULL and not a reply)
  const { data: cached, error } = await supabase
    .from('cached_emails')
    .select(
      'id, to_address, from_address, subject, body_text, email_timestamp, sender_account'
    )
    .eq('client_id', clientId)
    .eq('is_reply', false)
    .not('sender_account', 'is', null)
    .order('email_timestamp', { ascending: false })

  if (error) {
    console.error('[sent-data] Failed to fetch sent emails from cache:', error.message)
  }

  return (cached ?? []).map(mapToSentEmail)
}

/**
 * Get full detail of a single sent email.
 */
export async function getSentEmailDetail(
  clientId: string,
  emailId: string
): Promise<SentEmailDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cached_emails')
    .select('*')
    .eq('client_id', clientId)
    .eq('id', emailId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    toAddress: data.to_address,
    fromAddress: data.from_address,
    subject: data.subject,
    previewText: data.body_text ? data.body_text.substring(0, 120).trim() : null,
    sentAt: data.email_timestamp,
    bodyHtml: data.body_html,
    bodyText: data.body_text,
  }
}

// --- Internal helpers ---

function mapToSentEmail(row: {
  id: string
  to_address: string
  from_address: string
  subject: string | null
  body_text: string | null
  email_timestamp: string | null
}): SentEmail {
  return {
    id: row.id,
    toAddress: row.to_address,
    fromAddress: row.from_address,
    subject: row.subject,
    previewText: row.body_text
      ? row.body_text.substring(0, 120).trim()
      : null,
    sentAt: row.email_timestamp,
  }
}

/**
 * Populate the cached_emails table from Instantly API for all client campaigns.
 * One-time warm-up; subsequent visits use cached data.
 */
async function populateSentEmailCache(clientId: string): Promise<void> {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Get client's campaign IDs
  const { data: campaigns } = await supabase
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (!campaigns || campaigns.length === 0) return

  for (const campaign of campaigns) {
    try {
      let cursor: string | undefined

      do {
        const response = await listEmails({
          campaignId: campaign.campaign_id,
          limit: 100,
          startingAfter: cursor,
          sortOrder: 'desc',
        })

        const emails = response.items
        if (emails.length === 0) break

        const cacheRows = emails.map((email) => ({
          client_id: clientId,
          instantly_email_id: email.id,
          thread_id: email.thread_id,
          lead_email: email.is_reply
            ? email.from_address_email
            : email.to_address_email_list,
          from_address: email.from_address_email,
          to_address: email.to_address_email_list,
          subject: email.subject,
          body_text: email.body?.text ?? null,
          body_html: email.body?.html ?? null,
          is_reply: email.is_reply,
          sender_account: email.is_reply ? null : email.from_address_email,
          email_timestamp: email.timestamp_email ?? email.timestamp_created,
        }))

        const { error: upsertError } = await admin
          .from('cached_emails')
          .upsert(cacheRows, { onConflict: 'instantly_email_id' })

        if (upsertError) {
          console.error(
            `[sent-data] Failed to cache emails for campaign ${campaign.campaign_id}:`,
            upsertError.message
          )
        }

        cursor = response.next_starting_after ?? undefined
      } while (cursor)
    } catch (err) {
      console.error(
        `[sent-data] Failed to fetch emails for campaign ${campaign.campaign_id}:`,
        err instanceof Error ? err.message : String(err)
      )
    }
  }
}
