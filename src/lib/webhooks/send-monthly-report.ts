// Maandelijks-rapport webhook naar Make.com.
// In tegenstelling tot notify-lead (fire-and-forget, backup-rol) is dit een
// expliciete operator-actie: we geven het resultaat terug zodat de UI kan
// bevestigen dat het rapport daadwerkelijk is verzonden.

// Vast Make-scenario voor het maandelijks rapport. Overschrijfbaar via env
// (MAKE_MONTHLY_REPORT_WEBHOOK_URL) zonder dat de owner code hoeft te wijzigen.
const DEFAULT_WEBHOOK_URL =
  'https://hook.eu2.make.com/ags2kfqkxwyf75ajgia7oal3o0cei6fq'

export interface MonthlyReportLead {
  id: string
  email: string
  name: string | null
  company: string | null
  label: string
  received_at: string
}

export interface MonthlyReportPayload {
  client_id: string
  client_name: string
  reply_rate: number
  campaign_opinion: string
  common_objections: string[]
  improvements: string[]
  additions: string | null
  start_date: string
  end_date: string
  lead_count: number
  leads: MonthlyReportLead[]
}

export async function sendMonthlyReportWebhook(
  payload: MonthlyReportPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  const webhookUrl =
    process.env.MAKE_MONTHLY_REPORT_WEBHOOK_URL ?? DEFAULT_WEBHOOK_URL

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(
        `[webhook:monthly-report] failed status=${res.status} body=${body}`
      )
      return { ok: false, error: `Make gaf status ${res.status} terug.` }
    }

    console.log(
      `[webhook:monthly-report] client=${payload.client_name} leads=${payload.lead_count} status=success`
    )
    return { ok: true }
  } catch (error) {
    console.error('[webhook:monthly-report] request failed:', error)
    return { ok: false, error: 'Verbinding met Make is mislukt.' }
  }
}
