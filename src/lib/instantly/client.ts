import type {
  InstantlyCampaign,
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
