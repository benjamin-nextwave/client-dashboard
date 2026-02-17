import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Build a system prompt with the client's full dashboard context for the chatbot.
 * Includes all data the client can see: contacts, leads, analytics, breakdowns, and CSV uploads.
 */
export async function buildChatSystemPrompt(clientId: string): Promise<string> {
  const supabase = createAdminClient()

  // Fetch all data in parallel
  const [
    clientResult,
    contactsResult,
    positiveLeadsResult,
    analyticsResult,
    allLeadsResult,
    csvUploadsResult,
    dncResult,
  ] = await Promise.all([
    supabase.from('clients').select('company_name').eq('id', clientId).single(),
    supabase.from('synced_leads').select('email').eq('client_id', clientId),
    supabase
      .from('synced_leads')
      .select(
        'email, first_name, last_name, company_name, job_title, industry, interest_status, client_has_replied, reply_subject, reply_content'
      )
      .eq('client_id', clientId)
      .eq('interest_status', 'positive'),
    supabase
      .from('campaign_analytics')
      .select('date, emails_sent, replies, bounced, opened')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
      .limit(90),
    supabase
      .from('synced_leads')
      .select('email, lead_status, interest_status, industry, job_title, company_name')
      .eq('client_id', clientId),
    supabase
      .from('csv_uploads')
      .select('filename, total_rows, status, headers, created_at')
      .eq('client_id', clientId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('dnc_entries')
      .select('entry_type, value')
      .eq('client_id', clientId),
  ])

  const companyName = clientResult.data?.company_name ?? 'de klant'
  const uniqueContacts = new Set((contactsResult.data ?? []).map((c) => c.email)).size

  // Positive leads
  const positiveLeads = positiveLeadsResult.data ?? []
  const uniquePositive = new Set(positiveLeads.map((l) => l.email))
  const positiveCount = uniquePositive.size
  const unanswered = positiveLeads.filter(
    (l) => uniquePositive.has(l.email) && !l.client_has_replied
  )
  const unansweredCount = new Set(unanswered.map((l) => l.email)).size

  // Analytics
  const analytics = analyticsResult.data ?? []
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const thisMonthAnalytics = analytics.filter((a) => a.date >= monthStart)
  const monthEmailsSent = thisMonthAnalytics.reduce((sum, r) => sum + (r.emails_sent ?? 0), 0)
  const monthReplies = thisMonthAnalytics.reduce((sum, r) => sum + (r.replies ?? 0), 0)
  const monthBounced = thisMonthAnalytics.reduce((sum, r) => sum + (r.bounced ?? 0), 0)
  const monthOpened = thisMonthAnalytics.reduce((sum, r) => sum + (r.opened ?? 0), 0)

  const totalEmailsSent = analytics.reduce((sum, r) => sum + (r.emails_sent ?? 0), 0)
  const totalReplies = analytics.reduce((sum, r) => sum + (r.replies ?? 0), 0)

  // Contact status breakdown
  const allLeads = allLeadsResult.data ?? []
  const emailStatusMap = new Map<string, string>()
  for (const lead of allLeads) {
    if (!emailStatusMap.has(lead.email)) {
      emailStatusMap.set(lead.email, lead.lead_status ?? 'unknown')
    }
  }
  const statusCounts = new Map<string, number>()
  for (const status of emailStatusMap.values()) {
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
  }

  const statusLabels: Record<string, string> = {
    emailed: 'Gemaild',
    not_yet_emailed: 'Nog niet gemaild',
    replied: 'Beantwoord',
    bounced: 'Gebounced',
  }

  const statusBreakdown = Array.from(statusCounts.entries())
    .map(([status, count]) => `  - ${statusLabels[status] ?? status}: ${count}`)
    .join('\n')

  // Industry breakdown
  const industryMap = new Map<string, number>()
  const seenIndustry = new Set<string>()
  for (const lead of allLeads) {
    if (!seenIndustry.has(lead.email)) {
      seenIndustry.add(lead.email)
      const industry = lead.industry || 'Onbekend'
      industryMap.set(industry, (industryMap.get(industry) ?? 0) + 1)
    }
  }
  const topIndustries = Array.from(industryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `  - ${name}: ${count}`)
    .join('\n')

  // Job title breakdown
  const jobTitleMap = new Map<string, number>()
  const seenJobTitle = new Set<string>()
  for (const lead of allLeads) {
    if (!seenJobTitle.has(lead.email)) {
      seenJobTitle.add(lead.email)
      const title = lead.job_title || 'Onbekend'
      jobTitleMap.set(title, (jobTitleMap.get(title) ?? 0) + 1)
    }
  }
  const topJobTitles = Array.from(jobTitleMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `  - ${name}: ${count}`)
    .join('\n')

  // Positive lead details (all, deduplicated)
  const seenPositive = new Set<string>()
  const positiveDetails = positiveLeads
    .filter((l) => {
      if (seenPositive.has(l.email)) return false
      seenPositive.add(l.email)
      return true
    })
    .slice(0, 20)
    .map((l) => {
      const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email
      const company = l.company_name ? ` (${l.company_name})` : ''
      const replied = l.client_has_replied ? ' [beantwoord]' : ' [actie vereist]'
      return `  - ${name}${company} — ${l.job_title ?? 'geen functie'}${replied}`
    })
    .join('\n')

  // CSV uploads summary
  const csvUploads = csvUploadsResult.data ?? []
  const csvSection = csvUploads.length > 0
    ? csvUploads
        .map((u) => `  - ${u.filename}: ${u.total_rows} rijen, status: ${u.status}, kolommen: ${(u.headers as string[]).join(', ')}`)
        .join('\n')
    : '  Geen CSV-bestanden geüpload.'

  // DNC list summary
  const dncEntries = dncResult.data ?? []
  const dncEmailCount = dncEntries.filter((e) => e.entry_type === 'email').length
  const dncDomainCount = dncEntries.filter((e) => e.entry_type === 'domain').length

  // Reply rate
  const replyRate = totalEmailsSent > 0 ? ((totalReplies / totalEmailsSent) * 100).toFixed(1) : '0'

  return `Je bent een behulpzame AI-assistent voor het NextWave dashboard van ${companyName}. Je spreekt Nederlands.

CAMPAGNEOVERZICHT:
- Totaal contacten in database: ${uniqueContacts}
- Positieve leads (totaal): ${positiveCount}
- Onbeantwoorde positieve leads: ${unansweredCount}
- Reply rate (totaal): ${replyRate}%

DEZE MAAND:
- Verzonden e-mails: ${monthEmailsSent}
- Reacties: ${monthReplies}
- Geopend: ${monthOpened}
- Gebounced: ${monthBounced}

TOTAAL (afgelopen 90 dagen):
- Verzonden e-mails: ${totalEmailsSent}
- Reacties: ${totalReplies}

CONTACTSTATUS:
${statusBreakdown}

TOP INDUSTRIEËN:
${topIndustries}

TOP FUNCTIETITELS:
${topJobTitles}

POSITIEVE LEADS (${positiveCount} totaal):
${positiveDetails || '  Geen positieve leads.'}

CSV-UPLOADS:
${csvSection}

DO NOT CONTACT LIJST:
- ${dncEmailCount} e-mailadressen geblokkeerd
- ${dncDomainCount} domeinen geblokkeerd

Je kunt vragen beantwoorden over:
- Alle campagnestatistieken en prestaties (aantallen, percentages, trends)
- Details over specifieke leads, industrieën en functietitels
- Uitleg over de verschillende onderdelen van het dashboard
- De geüploade CSV-bestanden en hun inhoud
- De Do Not Contact lijst
- Tips voor het opvolgen van leads
- Algemene vragen over cold email en outreach

Houd je antwoorden kort en behulpzaam. Je hebt GEEN toegang om gegevens te wijzigen of acties uit te voeren.`
}
