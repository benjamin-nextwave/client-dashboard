import type { InstantlyCampaign, InstantlyListResponse } from './types'

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
    `https://api.instantly.ai/api/v2/campaigns?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
      },
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
