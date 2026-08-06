import { assertOutboundAllowed } from '@/lib/safety/write-guard'
import type {
  InstantlyCampaign,
  InstantlyCampaignDetail,
  InstantlyCampaignAnalytics,
  InstantlyDailyAnalytics,
  InstantlyEmail,
  InstantlyLead,
  InstantlyListResponse,
} from './types'

const BASE_URL = 'https://api.instantly.ai/api/v2'

function getHeaders(apiKey?: string) {
  const key = apiKey || process.env.INSTANTLY_API_KEY
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

interface ListCampaignsOptions {
  search?: string
  status?: number
  limit?: number
  startingAfter?: string
  apiKey?: string
}

export async function listCampaigns(
  options?: ListCampaignsOptions
): Promise<InstantlyListResponse<InstantlyCampaign>> {
  const params = new URLSearchParams()

  if (options?.search) params.set('search', options.search)
  if (options?.status !== undefined) params.set('status', String(options.status))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.startingAfter) params.set('starting_after', options.startingAfter)

  const response = await fetch(
    `${BASE_URL}/campaigns?${params.toString()}`,
    {
      headers: getHeaders(options?.apiKey),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export async function getCampaignAnalyticsOverview(
  campaignIds: string[],
  startDate: string,
  endDate: string,
  apiKey?: string
): Promise<InstantlyCampaignAnalytics> {
  const params = new URLSearchParams({
    ids: campaignIds.join(','),
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `${BASE_URL}/campaigns/analytics/overview?${params.toString()}`,
    {
      headers: getHeaders(apiKey),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export async function getCampaignDailyAnalytics(
  campaignId: string,
  startDate: string,
  endDate: string,
  apiKey?: string
): Promise<InstantlyDailyAnalytics[]> {
  const params = new URLSearchParams({
    campaign_id: campaignId,
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `${BASE_URL}/campaigns/analytics/daily?${params.toString()}`,
    {
      headers: getHeaders(apiKey),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

export async function listLeads(
  campaignId: string,
  options?: { limit?: number; startingAfter?: string; interestStatus?: number; search?: string; apiKey?: string }
): Promise<InstantlyListResponse<InstantlyLead>> {
  const body: Record<string, unknown> = { campaign: campaignId }
  if (options?.limit) body.limit = options.limit
  if (options?.startingAfter) body.starting_after = options.startingAfter
  if (options?.interestStatus !== undefined) body.interest_value = options.interestStatus
  if (options?.search) body.search = options.search

  const response = await fetch(`${BASE_URL}/leads/list`, {
    method: 'POST',
    headers: getHeaders(options?.apiKey),
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

interface ListEmailsOptions {
  lead?: string
  eaccount?: string
  campaignId?: string
  limit?: number
  startingAfter?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  apiKey?: string
}

export async function listEmails(
  options?: ListEmailsOptions
): Promise<InstantlyListResponse<InstantlyEmail>> {
  const params = new URLSearchParams()

  if (options?.lead) params.set('lead', options.lead)
  if (options?.eaccount) params.set('eaccount', options.eaccount)
  if (options?.campaignId) params.set('campaign_id', options.campaignId)
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.startingAfter) params.set('starting_after', options.startingAfter)
  if (options?.sortOrder) params.set('sort_order', options.sortOrder)
  if (options?.search) params.set('search', options.search)

  const response = await fetch(
    `${BASE_URL}/emails?${params.toString()}`,
    {
      headers: getHeaders(options?.apiKey),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Search campaigns that contain a specific lead email.
 */
export async function getCampaignsForEmail(email: string, apiKey?: string): Promise<string[]> {
  const params = new URLSearchParams({
    search: email,
  })

  const response = await fetch(
    `${BASE_URL}/campaigns/search-by-contact?${params.toString()}`,
    {
      headers: getHeaders(apiKey),
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  const data = await response.json()
  const items = Array.isArray(data) ? data : (data.items ?? [])
  return items.map((c: { id: string }) => c.id)
}

interface ReplyEmailOptions {
  eaccount: string
  replyToUuid: string
  subject: string
  bodyHtml: string
  apiKey?: string
}

export async function replyToEmail(
  options: ReplyEmailOptions
): Promise<InstantlyEmail> {
  // Enige call in dit bestand die daadwerkelijk iets naar buiten stuurt: dit
  // verstuurt een echte e-mail naar een echte prospect. Alle andere functies
  // hier zijn lees-operaties en blijven in elke omgeving gewoon werken.
  assertOutboundAllowed('e-mail versturen via Instantly')

  const response = await fetch(`${BASE_URL}/emails/reply`, {
    method: 'POST',
    headers: getHeaders(options.apiKey),
    body: JSON.stringify({
      eaccount: options.eaccount,
      reply_to_uuid: options.replyToUuid,
      subject: options.subject,
      body: { html: options.bodyHtml },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}

/**
 * Haalt één campagne op inclusief `email_list`: de mailboxen die eraan
 * gekoppeld zijn. Dit is de enige bron die weet welke mailbox bij welke
 * campagne hoort — cached_emails heeft geen campaign_id en synced_leads bevat
 * alleen leads met een reactie.
 *
 * Nieuwe functie; bestaande calls in dit bestand zijn ongewijzigd. Puur lezen,
 * dus de write-guard raakt dit niet.
 *
 * Wijkt op één punt bewust af van de rest van dit bestand: in plaats van
 * `cache: no-store` staat er een revalidate, omdat dit per paginaweergave
 * één call per campagne zou zijn. De koppeling tussen campagne en mailboxen
 * verandert zelden.
 */
export async function getCampaignDetail(
  campaignId: string,
  options?: { apiKey?: string; revalidateSeconds?: number }
): Promise<InstantlyCampaignDetail> {
  const response = await fetch(`${BASE_URL}/campaigns/${campaignId}`, {
    headers: getHeaders(options?.apiKey),
    next: { revalidate: options?.revalidateSeconds ?? 900 },
  })

  if (!response.ok) {
    throw new Error(
      `Instantly API error: ${response.status} ${response.statusText}`
    )
  }

  return response.json()
}
