import { createClient } from '@/lib/supabase/server'

export interface ReferralOutreach {
  id: string
  toEmail: string
  fromEmail: string
  subject: string
  body: string
  sentAt: string
}

/**
 * De mail die al naar de doorverwezen persoon is gestuurd, of null.
 * Bestaat de tabel nog niet, dan ook null — de knop verschijnt dan gewoon en
 * de verzendactie meldt zelf wat er ontbreekt.
 */
export async function getReferralOutreach(
  leadId: string
): Promise<ReferralOutreach | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_referral_outreach')
    .select('id, to_email, from_email, subject, body, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as {
    id: string
    to_email: string
    from_email: string
    subject: string
    body: string
    sent_at: string
  }
  return {
    id: row.id,
    toEmail: row.to_email,
    fromEmail: row.from_email,
    subject: row.subject,
    body: row.body,
    sentAt: row.sent_at,
  }
}
