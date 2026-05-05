import type { LeadClassification } from './types'

export const CLASSIFICATION_LABEL: Record<LeadClassification, string> = {
  meeting_request: 'Wil meeting',
  phone_request: 'Wil telefonisch contact',
  interested: 'Heeft interesse',
  referral: 'Doorverwijzing',
  internal_review: 'Intern overleg',
  not_now_maybe_later: 'Niet nu, later mogelijk',
  not_interested: 'Geen interesse',
}

export const CLASSIFICATION_BADGE: Record<LeadClassification, string> = {
  meeting_request: 'bg-emerald-100 text-emerald-800',
  phone_request: 'bg-teal-100 text-teal-800',
  interested: 'bg-blue-100 text-blue-800',
  referral: 'bg-indigo-100 text-indigo-800',
  internal_review: 'bg-amber-100 text-amber-800',
  not_now_maybe_later: 'bg-gray-100 text-gray-800',
  not_interested: 'bg-rose-100 text-rose-800',
}
