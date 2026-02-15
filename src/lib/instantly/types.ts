export interface InstantlyCampaign {
  id: string
  name: string
  status: number
}

export interface InstantlyListResponse<T> {
  items: T[]
  next_starting_after?: string
}

export interface InstantlyCampaignAnalytics {
  sent: number
  contacted: number
  new_leads_contacted: number
  opened: number
  unique_opened: number
  replies: number
  unique_replies: number
  bounced: number
  clicked: number
  unique_clicks: number
}

export interface InstantlyDailyAnalytics {
  date: string
  sent: number
  contacted: number
  new_leads_contacted: number
  opened: number
  unique_opened: number
  replies: number
  unique_replies: number
  bounced: number
  clicked: number
  unique_clicks: number
}

export interface InstantlyLead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  website: string | null
  status: string
  status_summary: string | null
  email_open_count: number
  email_reply_count: number
  email_click_count: number
  payload: Record<string, unknown>
  timestamp_created: string
  timestamp_updated: string
  last_step_from: string | null
  last_step_id: string | null
}
