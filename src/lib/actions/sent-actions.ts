'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEmails } from '@/lib/instantly/client'
import type { SentEmail } from '@/lib/data/sent-data'

/**
 * Fetch sent emails from the last 24 hours for the logged-in client.
 * Calls the Instantly API directly per campaign, caches results,
 * and returns only outbound emails from the last 24 hours.
 */
export async function fetchSentEmails24h(): Promise<{
  success: boolean
  emails: SentEmail[]
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, emails: [], error: 'Niet ingelogd' }
  }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) {
    return { success: false, emails: [], error: 'Geen client gekoppeld' }
  }

  const admin = createAdminClient()

  // Get client's campaigns
  const { data: campaigns } = await admin
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (!campaigns || campaigns.length === 0) {
    return { success: true, emails: [] }
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Fetch emails per campaign from Instantly API
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

        // Check if we've gone past 24h — stop pagination
        const oldestTimestamp = emails[emails.length - 1].timestamp_email ?? emails[emails.length - 1].timestamp_created
        const oldestDate = new Date(oldestTimestamp)

        const cacheRows = emails
          .filter((e) => {
            const ts = e.timestamp_email ?? e.timestamp_created
            return new Date(ts) >= cutoff
          })
          .map((e) => {
            const isReply = e.ue_type === 2
            return {
              client_id: clientId,
              instantly_email_id: e.id,
              thread_id: e.thread_id,
              lead_email: e.lead?.toLowerCase() ?? (isReply
                ? e.from_address_email
                : e.to_address_email_list),
              from_address: e.from_address_email,
              to_address: e.to_address_email_list,
              subject: e.subject,
              body_text: e.body?.text ?? null,
              body_html: e.body?.html ?? null,
              is_reply: isReply,
              sender_account: isReply ? null : e.from_address_email,
              email_timestamp: e.timestamp_email ?? e.timestamp_created,
            }
          })

        if (cacheRows.length > 0) {
          await admin
            .from('cached_emails')
            .upsert(cacheRows, { onConflict: 'instantly_email_id' })
        }

        // Stop if oldest email is older than 24h
        if (oldestDate < cutoff) break

        cursor = response.next_starting_after ?? undefined
      } while (cursor)
    } catch (err) {
      console.error(
        `[sent-actions] Failed to fetch emails for campaign ${campaign.campaign_id}:`,
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  // Now read back from cache: outbound emails from last 24h
  const { data: cached, error } = await supabase
    .from('cached_emails')
    .select(
      'id, to_address, from_address, subject, body_text, email_timestamp, sender_account'
    )
    .eq('client_id', clientId)
    .eq('is_reply', false)
    .not('sender_account', 'is', null)
    .gte('email_timestamp', cutoff.toISOString())
    .order('email_timestamp', { ascending: false })

  if (error) {
    return { success: false, emails: [], error: error.message }
  }

  const emails: SentEmail[] = (cached ?? []).map((row) => ({
    id: row.id,
    toAddress: row.to_address,
    fromAddress: row.from_address,
    subject: row.subject,
    previewText: row.body_text ? row.body_text.substring(0, 120).trim() : null,
    sentAt: row.email_timestamp,
  }))

  return { success: true, emails }
}
