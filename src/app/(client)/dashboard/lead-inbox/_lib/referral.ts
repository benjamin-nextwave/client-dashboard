import { createClient } from '@/lib/supabase/server'

export interface ReferralOutreach {
  toEmail: string
  subject: string
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
    .select('to_email, subject, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as { to_email: string; subject: string; sent_at: string }
  return { toEmail: row.to_email, subject: row.subject, sentAt: row.sent_at }
}
