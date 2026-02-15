export interface InstantlyCampaign {
  id: string
  name: string
  status: number
}

export interface InstantlyListResponse<T> {
  items: T[]
  next_starting_after?: string
}
