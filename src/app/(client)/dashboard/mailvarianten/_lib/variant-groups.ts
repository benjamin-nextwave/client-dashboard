/**
 * Gedeelde afleidingen voor de mailvarianten-pagina.
 *
 * Bewust een gewone module zonder 'use client': zowel page.tsx (server) als de
 * panelen (client) lezen hieruit. Zou dit in een client-component staan, dan
 * kan de server de functies niet aanroepen.
 */
import type {
  MailVariant,
  MailVariantFeedbackActionType,
  MailVariantFeedbackSubmission,
  MailVariantStatus,
} from '@/lib/data/campaign'
import { deriveVariantStatus } from '@/lib/data/campaign'
import type { TranslationKey } from '@/lib/i18n'

export interface VariantView {
  variant: MailVariant
  status: MailVariantStatus
  /**
   * 1-based. Er is geen `version`-kolom in de database; het aantal
   * feedbackrondes + 1 is de dichtstbijzijnde benadering die de data toelaat.
   */
  version: number
  roundCount: number
  /** De operator heeft de variant aangepast ná de laatste feedbackronde. */
  isRevised: boolean
}

export interface MailGroup {
  mailNumber: number
  variants: VariantView[]
  approvedCount: number
}

/**
 * Drie kleuren met één betekenis, zodat je in één oogopslag ziet waar je zelf
 * nog iets moet doen:
 *   amber  — jij bent aan zet
 *   merk   — wij zijn aan zet
 *   groen  — afgerond
 * "open" stond eerder op grijs; dat las als "niets aan de hand", terwijl het
 * juist de enige status is die om een reactie van de klant vraagt.
 */
export const STATUS_COLOR: Record<MailVariantStatus, string> = {
  approved: 'var(--c-pos)',
  feedback_pending: 'var(--brand-color)',
  open: 'var(--c-warn)',
}

/** Achtergrond + tekst voor de statuschip. Dezelfde drie betekenissen. */
export const STATUS_CHIP_CLASS: Record<MailVariantStatus, string> = {
  approved:
    'bg-[color-mix(in_oklab,var(--c-pos)_13%,transparent)] text-pos',
  feedback_pending: 'bg-[var(--brand-12)] text-brand-ink',
  open: 'bg-[color-mix(in_oklab,var(--c-warn)_15%,transparent)] text-warn',
}

export const STATUS_LABEL_KEY: Record<MailVariantStatus, TranslationKey> = {
  approved: 'mailVariantsPage.statusApproved',
  feedback_pending: 'mailVariantsPage.statusFeedback',
  open: 'mailVariantsPage.statusOpen',
}

/** Uitleg van één regel onder de chip in het detailpaneel. */
export const STATUS_HINT_KEY: Record<MailVariantStatus, TranslationKey> = {
  approved: 'mailVariantsPage.statusApprovedHint',
  feedback_pending: 'mailVariantsPage.statusFeedbackHint',
  open: 'mailVariantsPage.statusOpenHint',
}

export interface VariantProgress {
  total: number
  approved: number
  open: number
  feedbackPending: number
}

export function summarizeProgress(groups: MailGroup[]): VariantProgress {
  const all = flattenGroups(groups)
  return {
    total: all.length,
    approved: all.filter((v) => v.status === 'approved').length,
    open: all.filter((v) => v.status === 'open').length,
    feedbackPending: all.filter((v) => v.status === 'feedback_pending').length,
  }
}

/**
 * Vaste benamingen voor mail 1/2/3. Klanten kunnen (nog) geen eigen naam per
 * mail kiezen — komt die kolom er, dan vervalt deze map.
 */
export const MAIL_TITLE_KEY: Record<number, TranslationKey> = {
  1: 'mailVariantsPage.mailTitle1',
  2: 'mailVariantsPage.mailTitle2',
  3: 'mailVariantsPage.mailTitle3',
}

export const ACTION_LABEL_KEY: Record<MailVariantFeedbackActionType, TranslationKey> = {
  replace_with: 'mailVariantsPage.actionReplace',
  remove: 'mailVariantsPage.actionRemove',
  other: 'mailVariantsPage.actionOther',
}

export function actionTagClass(action: MailVariantFeedbackActionType): string {
  if (action === 'replace_with') return 'bg-[var(--brand-12)] text-brand-ink'
  if (action === 'remove') {
    return 'bg-[color-mix(in_oklab,var(--c-neg)_12%,transparent)] text-neg'
  }
  return 'bg-track text-muted'
}

export function buildMailGroups(
  variants: MailVariant[],
  allFeedbackByVariant: Record<string, MailVariantFeedbackSubmission[]>
): MailGroup[] {
  const byMail = new Map<number, VariantView[]>()

  for (const variant of variants) {
    // getAllMailVariantFeedback levert nieuwste eerst.
    const rounds = allFeedbackByVariant[variant.id] ?? []
    const lastRound = rounds[0]?.submittedAt
    const view: VariantView = {
      variant,
      status: deriveVariantStatus(variant),
      version: rounds.length + 1,
      roundCount: rounds.length,
      isRevised: Boolean(
        lastRound && new Date(variant.updatedAt).getTime() > new Date(lastRound).getTime()
      ),
    }
    const list = byMail.get(variant.mailNumber) ?? []
    list.push(view)
    byMail.set(variant.mailNumber, list)
  }

  return [...byMail.entries()]
    .sort(([a], [b]) => a - b)
    .map(([mailNumber, list]) => ({
      mailNumber,
      variants: list.sort((a, b) => a.variant.position - b.variant.position),
      approvedCount: list.filter((v) => v.status === 'approved').length,
    }))
}

/** Platte lijst in raillezing: mail 1 boven, daarbinnen op positie. */
export function flattenGroups(groups: MailGroup[]): VariantView[] {
  return groups.flatMap((g) => g.variants)
}

/**
 * De variant waar het detailpaneel op opent: de eerste die nog een reactie van
 * de klant vraagt, anders de eerste uit de lijst.
 */
export function firstUnresolvedId(groups: MailGroup[]): string | null {
  const all = flattenGroups(groups)
  const open = all.find((v) => v.status === 'open')
  return (open ?? all[0])?.variant.id ?? null
}

/** Varianten die de operator heeft bijgewerkt ná het laatste akkoord. */
export function countRevisedSince(variants: MailVariant[], since: string | null): number {
  if (!since) return 0
  const cutoff = new Date(since).getTime()
  return variants.filter((v) => new Date(v.updatedAt).getTime() > cutoff).length
}
