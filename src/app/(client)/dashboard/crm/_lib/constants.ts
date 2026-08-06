import type { CrmActivityType, CrmPriority, CrmStageId } from './types'

interface StageMeta {
  id: CrmStageId
  name: string
  description: string
  color: string
  /** Telt mee in de open pipeline-waarde (dus niet gewonnen/verloren). */
  open: boolean
  // Pre-compiled Tailwind-klassen — de JIT kan geen strings samenstellen.
  chip: string
  dot: string
  bar: string
}

export const CRM_STAGES: readonly StageMeta[] = [
  {
    id: 'nieuw',
    name: 'Nieuw',
    description: 'Binnengekomen, nog niet opgepakt',
    color: '#64748b',
    open: true,
    chip: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    bar: 'bg-slate-400',
  },
  {
    id: 'contact',
    name: 'In gesprek',
    description: 'Actief contact met de lead',
    color: '#3b82f6',
    open: true,
    chip: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    bar: 'bg-blue-500',
  },
  {
    id: 'gekwalificeerd',
    name: 'Gekwalificeerd',
    description: 'Past bij het profiel, échte kans',
    color: '#8b5cf6',
    open: true,
    chip: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    bar: 'bg-violet-500',
  },
  {
    id: 'voorstel',
    name: 'Voorstel',
    description: 'Offerte of voorstel ligt er',
    color: '#f59e0b',
    open: true,
    chip: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    bar: 'bg-amber-500',
  },
  {
    id: 'gewonnen',
    name: 'Gewonnen',
    description: 'Klant geworden',
    color: '#10b981',
    open: false,
    chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  {
    id: 'verloren',
    name: 'Verloren',
    description: 'Afgevallen of geen interesse',
    color: '#ef4444',
    open: false,
    chip: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    bar: 'bg-rose-500',
  },
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
  chip: string
  dot: string
  weight: number
}

export const CRM_PRIORITIES: readonly PriorityMeta[] = [
  { id: 'hoog', name: 'Hoog', chip: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', weight: 3 },
  { id: 'normaal', name: 'Normaal', chip: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400', weight: 2 },
  { id: 'laag', name: 'Laag', chip: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-400', weight: 1 },
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
  chip: string
}

export const CRM_ACTIVITY_TYPES: readonly ActivityMeta[] = [
  { id: 'notitie', name: 'Notitie', chip: 'bg-gray-100 text-gray-700' },
  { id: 'telefoon', name: 'Telefoongesprek', chip: 'bg-teal-50 text-teal-700' },
  { id: 'email', name: 'E-mail', chip: 'bg-blue-50 text-blue-700' },
  { id: 'meeting', name: 'Meeting', chip: 'bg-emerald-50 text-emerald-700' },
  { id: 'taak', name: 'Taak', chip: 'bg-amber-50 text-amber-700' },
  { id: 'fase', name: 'Fasewijziging', chip: 'bg-violet-50 text-violet-700' },
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
  { value: '#ef4444', name: 'Rood' },
  { value: '#f97316', name: 'Oranje' },
  { value: '#eab308', name: 'Geel' },
  { value: '#22c55e', name: 'Groen' },
  { value: '#14b8a6', name: 'Turquoise' },
  { value: '#0ea5e9', name: 'Lichtblauw' },
  { value: '#3b82f6', name: 'Blauw' },
  { value: '#8b5cf6', name: 'Paars' },
  { value: '#ec4899', name: 'Roze' },
  { value: '#6b7280', name: 'Grijs' },
] as const

export const DEFAULT_LABEL_COLOR: string = CRM_COLOR_PALETTE[6].value
