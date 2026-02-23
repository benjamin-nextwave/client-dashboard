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

export interface InstantlyEmail {
  id: string // UUID - used as reply_to_uuid
  thread_id: string
  from_address_email: string
  to_address_email_list: string
  subject: string
  body: { text?: string; html?: string }
  timestamp_created: string
  timestamp_email?: string
  is_reply?: boolean // Not returned by API v2; use ue_type instead
  ue_type?: number // 1 = outbound, 2 = inbound reply
  lead?: string // Lead's email address (most reliable identifier)
  campaign_id?: string
  subsequence_id?: string | null
  i_status?: number // -1 = not interested, 0 = neutral, 1 = interested
  is_unread?: number | boolean
  attachments?: unknown[] | null
}

export interface InstantlyLead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  phone: string | null
  website: string | null
  status: number
  status_summary: Record<string, unknown> | null
  email_open_count: number
  email_reply_count: number
  email_click_count: number
  lt_interest_status?: number | string | null
  label_ids?: string[] | null
  payload: Record<string, unknown>
  timestamp_created: string
  timestamp_updated: string
  last_step_from: string | null
  last_step_id: string | null
}
