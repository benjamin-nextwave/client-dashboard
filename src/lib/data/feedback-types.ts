// Pure types + constants for feedback — safe to import from both server
// and client components (no server-only imports here).

export type FeedbackCategory =
  | 'bug'
  | 'new_feature'
  | 'optimization'
  | 'other'
  | 'campaign_performance'
  | 'new_mail_variants'

export const VARIANT_REASONS = [
  'too_formal',
  'too_informal',
  'wrong_wording',
  'incorrect_data',
  'tone_mismatch',
  'other',
] as const

export type VariantReason = (typeof VARIANT_REASONS)[number]

export const VARIANT_REASON_LABELS: Record<VariantReason, string> = {
  too_formal: 'Huidige mails zijn te formeel',
  too_informal: 'Huidige mails zijn te informeel',
  wrong_wording: 'Verwoording is niet goed',
  incorrect_data: 'Er zitten foutieve data in',
  tone_mismatch: 'Toon past niet bij ons merk',
  other: 'Iets anders',
}

export interface FeedbackMetadata {
  variant_reasons?: VariantReason[]
}

export type FeedbackRequest = {
  id: string
  client_id: string
  user_id: string
  category: FeedbackCategory
  title: string
  description: string
  status: 'new' | 'in_progress' | 'thinking' | 'denied' | 'applied'
  operator_response: string | null
  metadata: FeedbackMetadata | null
  created_at: string
  updated_at: string
}

export type FeedbackWithClient = FeedbackRequest & {
  company_name: string
}
