import type { LeadLabel, ObjectionStatus } from '@/lib/data/campaign-leads'

/**
 * De zeven gekleurde badges uit LABEL_META zijn vervangen door één neutrale
 * chip met een gekleurde stip. Dezelfde variabelen als in de Lead inbox, zodat
 * een categorie overal dezelfde kleur heeft.
 */
export const LABEL_DOT: Record<LeadLabel, string> = {
  meeting_voorstel: 'var(--c-cat-meeting)',
  geinteresseerd: 'var(--c-cat-interested)',
  telefonisch_voorstel: 'var(--c-cat-phone)',
  komt_erop_terug: 'var(--c-cat-internal)',
  doorverwezen: 'var(--c-cat-referral)',
  later_mogelijk: 'var(--c-cat-later)',
  geen_interesse: 'var(--c-cat-none)',
}

export type SortKey = 'newest' | 'oldest' | 'company' | 'category'

export const OBJECTION_COLOR: Record<ObjectionStatus, string> = {
  pending: 'var(--c-warn)',
  approved: 'var(--c-pos)',
  rejected: 'var(--c-neg)',
}

/** Reactietekst tot één regel platslaan voor de tabelrij. */
export function replySnippet(body: string | null): string {
  if (!body) return ''
  return body.replace(/\s+/g, ' ').trim()
}
