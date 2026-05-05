import { createClient } from '@/lib/supabase/server'
import type {
  Lead,
  LeadWithStatus,
  OutboundReply,
  ThreadItem,
} from './types'

const LEAD_COLUMNS = `
  id,
  customer_id,
  email,
  name,
  classification,
  thread_id,
  first_campaign_id,
  sending_account,
  first_reply_at,
  last_reply_at,
  notified_at,
  replies,
  created_at,
  updated_at
`

const OUTBOUND_COLUMNS = `
  id,
  lead_id,
  customer_id,
  in_reply_to_email_id,
  thread_id,
  sending_account,
  to_email,
  subject,
  body,
  status,
  error_message,
  sent_at,
  instantly_email_id,
  created_at,
  updated_at
`

function maxIso(...candidates: Array<string | null | undefined>): string | null {
  let max: string | null = null
  for (const c of candidates) {
    if (!c) continue
    if (max === null || c > max) max = c
  }
  return max
}

function deriveStatus(
  lead: Lead,
  outbounds: OutboundReply[]
): Pick<
  LeadWithStatus,
  'lastInboundAt' | 'lastOutboundAt' | 'awaitingOurReply' | 'pendingOutboundCount'
> {
  const lastInboundAt =
    lead.replies
      .filter((r) => r.direction !== 'outbound')
      .reduce<string | null>(
        (acc, r) => maxIso(acc, r.received_at),
        null
      ) ?? null

  const outboundFromJsonb = lead.replies
    .filter((r) => r.direction === 'outbound')
    .reduce<string | null>((acc, r) => maxIso(acc, r.received_at), null)

  const outboundFromTable = outbounds
    .filter((o) => o.status !== 'failed')
    .reduce<string | null>(
      (acc, o) => maxIso(acc, o.sent_at, o.created_at),
      null
    )

  const lastOutboundAt = maxIso(outboundFromJsonb, outboundFromTable)

  const awaitingOurReply =
    !lastOutboundAt || (lastInboundAt !== null && lastInboundAt > lastOutboundAt)

  const pendingOutboundCount = outbounds.filter(
    (o) => o.status === 'queued' || o.status === 'sending'
  ).length

  return { lastInboundAt, lastOutboundAt, awaitingOurReply, pendingOutboundCount }
}

export async function getLeadsWithStatusForCustomer(
  customerId: string
): Promise<LeadWithStatus[]> {
  const supabase = await createClient()
  const [leadsResult, outboundResult] = await Promise.all([
    supabase
      .from('leads')
      .select(LEAD_COLUMNS)
      .eq('customer_id', customerId)
      .order('last_reply_at', { ascending: false }),
    supabase
      .from('outbound_replies')
      .select(OUTBOUND_COLUMNS)
      .eq('customer_id', customerId),
  ])

  if (leadsResult.error) {
    throw new Error(`getLeadsWithStatusForCustomer leads: ${leadsResult.error.message}`)
  }
  if (outboundResult.error) {
    throw new Error(
      `getLeadsWithStatusForCustomer outbound: ${outboundResult.error.message}`
    )
  }

  const leads = (leadsResult.data ?? []) as unknown as Lead[]
  const outbounds = (outboundResult.data ?? []) as unknown as OutboundReply[]

  return leads.map((lead) => {
    const leadOutbounds = outbounds.filter((o) => o.lead_id === lead.id)
    return { ...lead, ...deriveStatus(lead, leadOutbounds) }
  })
}

export async function getLeadById(
  customerId: string,
  leadId: string
): Promise<Lead | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('customer_id', customerId)
    .eq('id', leadId)
    .maybeSingle()

  if (error) throw new Error(`getLeadById: ${error.message}`)
  return (data ?? null) as Lead | null
}

export async function getOutboundRepliesForLead(
  customerId: string,
  leadId: string
): Promise<OutboundReply[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outbound_replies')
    .select(OUTBOUND_COLUMNS)
    .eq('customer_id', customerId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`getOutboundRepliesForLead: ${error.message}`)
  return (data ?? []) as unknown as OutboundReply[]
}

// Combineer JSONB-replies en outbound_replies tot één chronologische thread.
// Dedupe: als een outbound entry zowel in JSONB (door Make appended) als in
// outbound_replies bestaat met dezelfde instantly_email_id, prefer de tabel-rij
// (die heeft status + error_message).
export function buildThreadItems(
  lead: Lead,
  outbounds: OutboundReply[]
): ThreadItem[] {
  const outboundEmailIds = new Set(
    outbounds.map((o) => o.instantly_email_id).filter((x): x is string => !!x)
  )

  const inbound: ThreadItem[] = lead.replies
    .filter((r) => r.direction !== 'outbound')
    .map((r) => ({
      kind: 'inbound' as const,
      id: r.instantly_email_id,
      from_email: r.from_email,
      sending_account: r.sending_account,
      subject: r.subject,
      body: r.body,
      occurred_at: r.received_at,
      ai_interest_value: r.ai_interest_value,
    }))

  const outboundFromJsonb: ThreadItem[] = lead.replies
    .filter(
      (r) =>
        r.direction === 'outbound' &&
        !outboundEmailIds.has(r.instantly_email_id)
    )
    .map((r) => ({
      kind: 'outbound' as const,
      id: r.instantly_email_id,
      from_email: r.sending_account,
      sending_account: r.sending_account,
      to_email: lead.email,
      subject: r.subject,
      body: r.body,
      occurred_at: r.received_at,
      status: 'sent' as const,
      error_message: null,
    }))

  const outboundFromTable: ThreadItem[] = outbounds.map((o) => ({
    kind: 'outbound' as const,
    id: o.id,
    from_email: o.sending_account,
    sending_account: o.sending_account,
    to_email: o.to_email,
    subject: o.subject,
    body: o.body,
    occurred_at: o.sent_at ?? o.created_at,
    status: o.status,
    error_message: o.error_message,
  }))

  return [...inbound, ...outboundFromJsonb, ...outboundFromTable].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  )
}
