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

/**
 * Stipkleur per categorie. Vervangt het gekleurde vlak van CLASSIFICATION_BADGE
 * in de lijst en de mappen: één neutrale chip met een gekleurde stip, zodat de
 * kleur betekenis houdt zonder dat de lijst uiteenvalt in zeven kleurvlakken.
 */
export const CLASSIFICATION_DOT: Record<LeadClassification, string> = {
  meeting_request: 'var(--c-cat-meeting)',
  phone_request: 'var(--c-cat-phone)',
  interested: 'var(--c-cat-interested)',
  referral: 'var(--c-cat-referral)',
  internal_review: 'var(--c-cat-internal)',
  not_now_maybe_later: 'var(--c-cat-later)',
  not_interested: 'var(--c-cat-none)',
}
