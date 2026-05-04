export type LeadClassification =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'spam'
  | 'unknown'

export type LeadReply = {
  instantly_email_id: string
  campaign_id: string
  sending_account: string
  from_email: string
  subject: string
  body: string
  received_at: string
  ai_interest_value: number | null
  classification: LeadClassification
  raw_payload: Record<string, unknown>
}

export type Lead = {
  id: string
  customer_id: string
  email: string
  name: string | null
  classification: LeadClassification
  thread_id: string | null
  first_campaign_id: string
  sending_account: string
  first_reply_at: string
  last_reply_at: string
  notified_at: string | null
  replies: LeadReply[]
  created_at: string
  updated_at: string
}
