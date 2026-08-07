import type { CrmActivityType, CrmPriority, CrmStageId } from './types'

interface StageMeta {
  id: CrmStageId
  name: string
  description: string
  /** CSS-variabele — dezelfde gedempte palet als de Lead inbox en Campagne leads. */
  color: string
  /** Telt mee als "actief in gesprek" (dus niet nieuw/gewonnen/verloren). */
  active: boolean
}

export const CRM_STAGES: readonly StageMeta[] = [
  { id: 'nieuw', name: 'Nieuw', description: 'Binnengekomen, nog niet opgepakt', color: 'var(--c-cat-later)', active: false },
  { id: 'contact', name: 'In gesprek', description: 'Actief contact met de lead', color: 'var(--c-cat-phone)', active: true },
  { id: 'gekwalificeerd', name: 'Gekwalificeerd', description: 'Past bij het profiel, échte kans', color: 'var(--c-cat-interested)', active: true },
  { id: 'voorstel', name: 'Voorstel', description: 'Offerte of voorstel ligt er', color: 'var(--c-cat-referral)', active: true },
  { id: 'gewonnen', name: 'Gewonnen', description: 'Klant geworden', color: 'var(--c-cat-meeting)', active: false },
  { id: 'verloren', name: 'Verloren', description: 'Afgevallen of geen interesse', color: 'var(--color-neg)', active: false },
] as const

export const STAGE_META: Record<CrmStageId, StageMeta> = CRM_STAGES.reduce(
  (acc, s) => {
    acc[s.id] = s
    return acc
  },
  {} as Record<CrmStageId, StageMeta>
)

export const DEFAULT_STAGE: CrmStageId = 'nieuw'
export const DEFAULT_PRIORITY: CrmPriority = 'normaal'

interface PriorityMeta {
  id: CrmPriority
  name: string
  color: string
  weight: number
}

export const CRM_PRIORITIES: readonly PriorityMeta[] = [
  { id: 'hoog', name: 'Hoog', color: 'var(--color-neg)', weight: 3 },
  { id: 'normaal', name: 'Normaal', color: 'var(--color-faint)', weight: 2 },
  { id: 'laag', name: 'Laag', color: 'var(--c-cat-phone)', weight: 1 },
] as const

export const PRIORITY_META: Record<CrmPriority, PriorityMeta> = CRM_PRIORITIES.reduce(
  (acc, p) => {
    acc[p.id] = p
    return acc
  },
  {} as Record<CrmPriority, PriorityMeta>
)

interface ActivityMeta {
  id: CrmActivityType
  name: string
  color: string
}

export const CRM_ACTIVITY_TYPES: readonly ActivityMeta[] = [
  { id: 'notitie', name: 'Notitie', color: 'var(--c-cat-later)' },
  { id: 'telefoon', name: 'Telefoongesprek', color: 'var(--c-cat-phone)' },
  { id: 'email', name: 'E-mail', color: 'var(--c-cat-interested)' },
  { id: 'meeting', name: 'Meeting', color: 'var(--c-cat-meeting)' },
  { id: 'taak', name: 'Taak', color: 'var(--c-cat-referral)' },
  { id: 'fase', name: 'Fasewijziging', color: 'var(--c-cat-internal)' },
] as const

export const ACTIVITY_META: Record<CrmActivityType, ActivityMeta> =
  CRM_ACTIVITY_TYPES.reduce(
    (acc, a) => {
      acc[a.id] = a
      return acc
    },
    {} as Record<CrmActivityType, ActivityMeta>
  )

/** Vooringestelde labelkleuren. De DB accepteert vrije tekst. */
export const CRM_COLOR_PALETTE = [
  { value: '#b91c1c', name: 'Rood' },
  { value: '#b45309', name: 'Oranje' },
  { value: '#d97706', name: 'Amber' },
  { value: '#15803d', name: 'Groen' },
  { value: '#0f766e', name: 'Turquoise' },
  { value: '#0369a1', name: 'Blauw' },
  { value: '#4338ca', name: 'Indigo' },
  { value: '#7e22ce', name: 'Paars' },
  { value: '#be185d', name: 'Roze' },
  { value: '#6b7280', name: 'Grijs' },
] as const

export const DEFAULT_LABEL_COLOR: string = CRM_COLOR_PALETTE[5].value
