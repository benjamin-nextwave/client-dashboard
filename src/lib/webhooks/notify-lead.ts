export interface LeadWebhookPayload {
  notification_email: string
  lead_email: string
  status: 'Lead' | 'In gesprek'
  response: string | null
  lead_name: string
  website: string | null
  company_name: string | null
  dashboard_url: string | null
  vacature_url: string | null
  geen_recruitment: boolean
}

/**
 * Fire-and-forget webhook to Make.com for new positive lead notifications.
 * Disabled by default — Instantly sends notifications directly to Make.com.
 * Set ENABLE_LEAD_WEBHOOK=true in .env to re-enable as a backup.
 * Errors are logged but never thrown — webhook failures must not block sync.
 */
export async function sendLeadWebhook(payload: LeadWebhookPayload): Promise<void> {
  if (process.env.ENABLE_LEAD_WEBHOOK !== 'true') {
    return
  }

  const webhookUrl = process.env.MAKE_WEBHOOK_URL
  if (!webhookUrl) {
    console.warn('MAKE_WEBHOOK_URL is not set — skipping lead webhook')
    return
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error(`Lead webhook failed with status ${res.status}: ${await res.text()}`)
    }
  } catch (error) {
    console.error('Lead webhook request failed:', error)
  }
}
