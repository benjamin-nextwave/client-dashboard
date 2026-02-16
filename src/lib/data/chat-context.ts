import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Build a system prompt with the client's campaign context for the chatbot.
 */
export async function buildChatSystemPrompt(clientId: string): Promise<string> {
  const supabase = createAdminClient()

  // Fetch client info
  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  // Fetch contact count
  const { data: contacts } = await supabase
    .from('synced_leads')
    .select('email')
    .eq('client_id', clientId)

  const uniqueContacts = new Set((contacts ?? []).map((c) => c.email)).size

  // Fetch positive leads
  const { data: positiveLeads } = await supabase
    .from('synced_leads')
    .select('email, first_name, last_name, company_name, interest_status, client_has_replied')
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')

  const uniquePositive = new Set((positiveLeads ?? []).map((l) => l.email))
  const positiveCount = uniquePositive.size
  const unanswered = (positiveLeads ?? []).filter(
    (l) => uniquePositive.has(l.email) && !l.client_has_replied
  )
  const unansweredCount = new Set(unanswered.map((l) => l.email)).size

  // Fetch this month's analytics
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const { data: analytics } = await supabase
    .from('campaign_analytics')
    .select('replies, emails_sent')
    .eq('client_id', clientId)
    .gte('date', monthStart)

  const monthReplies = (analytics ?? []).reduce((sum, r) => sum + (r.replies ?? 0), 0)
  const monthEmailsSent = (analytics ?? []).reduce((sum, r) => sum + (r.emails_sent ?? 0), 0)

  // Recent positive lead names (up to 5)
  const recentPositiveNames = [...uniquePositive]
    .slice(0, 5)
    .map((email) => {
      const lead = (positiveLeads ?? []).find((l) => l.email === email)
      return lead
        ? [lead.first_name, lead.last_name].filter(Boolean).join(' ') || email
        : email
    })

  const companyName = client?.company_name ?? 'de klant'

  return `Je bent een behulpzame AI-assistent voor het NextWave dashboard van ${companyName}. Je spreekt Nederlands.

Hier is de huidige campagnedata:
- Totaal contacten in database: ${uniqueContacts}
- Positieve leads (totaal): ${positiveCount}
- Onbeantwoorde positieve leads: ${unansweredCount}
- Verzonden e-mails deze maand: ${monthEmailsSent}
- Reacties deze maand: ${monthReplies}
${recentPositiveNames.length > 0 ? `- Recente positieve leads: ${recentPositiveNames.join(', ')}` : ''}

Je kunt vragen beantwoorden over:
- De campagnestatistieken en prestaties
- Uitleg over de verschillende onderdelen van het dashboard
- Tips voor het opvolgen van leads
- Algemene vragen over cold email en outreach

Houd je antwoorden kort en behulpzaam. Je hebt GEEN toegang om gegevens te wijzigen of acties uit te voeren.`
}
