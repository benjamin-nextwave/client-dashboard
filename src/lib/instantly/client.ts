import type {
  InstantlyCampaign,
  InstantlyCampaignAnalytics,
  InstantlyDailyAnalytics,
  InstantlyLead,
  InstantlyListResponse,
} from './types'

const BASE_URL = 'https://api.instantly.ai/api/v2'

function getHeaders() {
  return {
    Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

interface ListCampaignsOptions {
  search?: string
  status?: number
  limit?: number
  startingAfter?: string
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
      headers: getHeaders(),
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
  endDate: string
): Promise<InstantlyCampaignAnalytics> {
  const params = new URLSearchParams({
    ids: campaignIds.join(','),
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `${BASE_URL}/campaigns/analytics/overview?${params.toString()}`,
    {
      headers: getHeaders(),
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
  endDate: string
): Promise<InstantlyDailyAnalytics[]> {
  const params = new URLSearchParams({
    campaign_id: campaignId,
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `${BASE_URL}/campaigns/analytics/daily?${params.toString()}`,
    {
      headers: getHeaders(),
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
  options?: { limit?: number; startingAfter?: string; interestStatus?: string }
): Promise<InstantlyListResponse<InstantlyLead>> {
  const body: Record<string, unknown> = { campaign_id: campaignId }
  if (options?.limit) body.limit = options.limit
  if (options?.startingAfter) body.starting_after = options.startingAfter
  if (options?.interestStatus) body.interest_status = options.interestStatus

  const response = await fetch(`${BASE_URL}/leads/list`, {
    method: 'POST',
    headers: getHeaders(),
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
