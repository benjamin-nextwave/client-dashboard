'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEmails } from '@/lib/instantly/client'
import type { SentEmail } from '@/lib/data/sent-data'

export async function fetchSentEmails(): Promise<
  { success: true; emails: SentEmail[] } | { error: string }
> {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Get current user's client_id
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  if (!profile?.client_id) return { error: 'Geen client gevonden.' }

  const clientId = profile.client_id

  // Get client's campaign IDs
  const { data: campaigns } = await supabase
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (!campaigns || campaigns.length === 0) {
    return { success: true, emails: [] }
  }

  // Fetch emails from Instantly for each campaign (last 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

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

        // Stop paginating if we've gone past 24h
        const oldestEmail = emails[emails.length - 1]
        const oldestTime = oldestEmail.timestamp_email ?? oldestEmail.timestamp_created
        if (oldestTime && new Date(oldestTime) < cutoff) {
          // Filter to only include last 24h
          const recentEmails = emails.filter((e) => {
            const t = e.timestamp_email ?? e.timestamp_created
            return t && new Date(t) >= cutoff
          })

          if (recentEmails.length > 0) {
            await cacheEmails(admin, clientId, recentEmails)
          }
          break
        }

        await cacheEmails(admin, clientId, emails)
        cursor = response.next_starting_after ?? undefined
      } while (cursor)
    } catch (err) {
      console.error(
        `[sent-actions] Failed to fetch emails for campaign ${campaign.campaign_id}:`,
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  // Now read from cache (last 24h outbound only)
  const { data: cached } = await supabase
    .from('cached_emails')
    .select('id, to_address, from_address, subject, body_text, email_timestamp')
    .eq('client_id', clientId)
    .eq('is_reply', false)
    .not('sender_account', 'is', null)
    .gte('email_timestamp', cutoff.toISOString())
    .order('email_timestamp', { ascending: false })

  const emails: SentEmail[] = (cached ?? []).map((row) => ({
    id: row.id,
    toAddress: row.to_address,
    fromAddress: row.from_address,
    subject: row.subject,
    previewText: row.body_text ? row.body_text.substring(0, 120).trim() : null,
    sentAt: row.email_timestamp,
  }))

  revalidatePath('/dashboard/verzonden')
  return { success: true, emails }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cacheEmails(admin: any, clientId: string, emails: any[]) {
  const cacheRows = emails.map((email) => {
    const isReply = email.ue_type === 2
    return {
      client_id: clientId,
      instantly_email_id: email.id,
      thread_id: email.thread_id,
      lead_email: email.lead?.toLowerCase() ?? (isReply
        ? email.from_address_email
        : email.to_address_email_list),
      from_address: email.from_address_email,
      to_address: email.to_address_email_list,
      subject: email.subject,
      body_text: email.body?.text ?? null,
      body_html: email.body?.html ?? null,
      is_reply: isReply,
      sender_account: isReply ? null : email.from_address_email,
      email_timestamp: email.timestamp_email ?? email.timestamp_created,
    }
  })

  const { error } = await admin
    .from('cached_emails')
    .upsert(cacheRows, { onConflict: 'instantly_email_id' })

  if (error) {
    console.error('[sent-actions] Failed to cache emails:', error.message)
  }
}
