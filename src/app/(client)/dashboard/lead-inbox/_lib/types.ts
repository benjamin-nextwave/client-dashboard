export type LeadClassification =
  | 'meeting_request'
  | 'phone_request'
  | 'interested'
  | 'referral'
  | 'internal_review'
  | 'not_now_maybe_later'
  | 'not_interested'

export type ReplyDirection = 'inbound' | 'outbound'

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
  direction: ReplyDirection
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
  deleted_at: string | null
  replies: LeadReply[]
  created_at: string
  updated_at: string
}

export type UserLabel = {
  id: string
  customer_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export type LeadNote = {
  id: string
  lead_id: string
  body: string
  color: string
  created_at: string
  updated_at: string
}

export type OutboundReplyStatus = 'queued' | 'sending' | 'sent' | 'failed'

export type OutboundReply = {
  id: string
  lead_id: string
  customer_id: string
  in_reply_to_email_id: string
  thread_id: string | null
  sending_account: string
  to_email: string
  subject: string
  body: string
  status: OutboundReplyStatus
  error_message: string | null
  sent_at: string | null
  instantly_email_id: string | null
  created_at: string
  updated_at: string
}

// Per-lead afgeleide status, gebruikt voor folder-routing en lijst-weergave.
export type LeadWithStatus = Lead & {
  lastInboundAt: string | null
  lastOutboundAt: string | null
  awaitingOurReply: boolean
  pendingOutboundCount: number
  labels: UserLabel[]
  noteCount: number
}

// Genormaliseerde thread-entry voor weergave (mengt inbound JSONB en outbound table).
export type ThreadItem =
  | {
      kind: 'inbound'
      id: string // instantly_email_id
      from_email: string
      sending_account: string
      subject: string
      body: string
      occurred_at: string
      ai_interest_value: number | null
    }
  | {
      kind: 'outbound'
      id: string // outbound_replies.id of instantly_email_id na sent
      from_email: string // sending_account
      sending_account: string
      to_email: string
      subject: string
      body: string
      occurred_at: string // sent_at ?? created_at
      status: OutboundReplyStatus
      error_message: string | null
    }
