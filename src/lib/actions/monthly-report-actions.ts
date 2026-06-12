'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getCampaignLeads } from '@/lib/data/campaign-leads'
import {
  sendMonthlyReportWebhook,
  type MonthlyReportLead,
} from '@/lib/webhooks/send-monthly-report'

type ActionResult = { success: true; leadCount: number } | { error: string }

const DateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige datum (verwacht JJJJ-MM-DD).')

const MonthlyReportSchema = z
  .object({
    clientId: z.string().uuid('Kies een geldige klant.'),
    replyRate: z
      .number({ invalid_type_error: 'Reply rate moet een getal zijn.' })
      .min(0, 'Reply rate kan niet negatief zijn.')
      .max(100, 'Reply rate kan niet hoger zijn dan 100.'),
    campaignOpinion: z
      .string()
      .trim()
      .min(1, 'Vul je mening over de campagne in.')
      .max(5000),
    commonObjections: z.array(z.string().trim().max(500)),
    improvements: z.array(z.string().trim().max(500)),
    additions: z.string().trim().max(5000).optional().nullable(),
    startDate: DateSchema,
    endDate: DateSchema,
  })
  .refine((v) => v.startDate <= v.endDate, {
    message: 'De startdatum moet voor of op de einddatum liggen.',
    path: ['endDate'],
  })

export async function submitMonthlyReport(
  input: z.input<typeof MonthlyReportSchema>
): Promise<ActionResult> {
  // Auth: alleen de operator mag rapporten versturen.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }
  if ((user.app_metadata?.user_role as string | undefined) !== 'operator') {
    return { error: 'Geen toegang.' }
  }

  const parsed = MonthlyReportSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }
  const v = parsed.data

  // Lege regels uit de dynamische lijsten filteren.
  const commonObjections = v.commonObjections
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  const improvements = v.improvements
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  // Klantnaam ophalen.
  const admin = createAdminClient()
  const { data: client, error: clientErr } = await admin
    .from('clients')
    .select('id, company_name')
    .eq('id', v.clientId)
    .single()

  if (clientErr || !client) return { error: 'Klant niet gevonden.' }

  // Leads ophalen via de gedeelde bron (dekt handmatige campaign_leads én
  // de lead-inbox), daarna filteren op de campagneperiode. Goedgekeurde
  // bezwaren tellen niet mee — die lead is door de operator afgekeurd.
  const startMs = new Date(`${v.startDate}T00:00:00.000`).getTime()
  const endMs = new Date(`${v.endDate}T23:59:59.999`).getTime()

  const allLeads = await getCampaignLeads(v.clientId)
  const leads: MonthlyReportLead[] = allLeads
    .filter((lead) => {
      if (lead.objectionStatus === 'approved') return false
      const receivedMs = new Date(lead.receivedAt).getTime()
      return receivedMs >= startMs && receivedMs <= endMs
    })
    .map((lead) => ({
      id: lead.id,
      email: lead.leadEmail,
      name: lead.leadName,
      company: lead.leadCompany,
      label: lead.label,
      received_at: lead.receivedAt,
    }))

  const result = await sendMonthlyReportWebhook({
    client_id: client.id,
    client_name: client.company_name,
    reply_rate: v.replyRate,
    campaign_opinion: v.campaignOpinion,
    common_objections: commonObjections,
    improvements,
    additions:
      v.additions && v.additions.length > 0 ? v.additions : null,
    start_date: v.startDate,
    end_date: v.endDate,
    lead_count: leads.length,
    leads,
  })

  if (!result.ok) {
    return { error: `Verzenden naar Make mislukt: ${result.error}` }
  }

  return { success: true, leadCount: leads.length }
}
