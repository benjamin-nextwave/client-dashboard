import { DEFAULT_PRIORITY, DEFAULT_STAGE } from './constants'
import type { CrmEntry, CrmPriority, CrmStageId } from './types'

export function stageOf(entry: CrmEntry): CrmStageId {
  return entry.record?.stage ?? DEFAULT_STAGE
}

export function priorityOf(entry: CrmEntry): CrmPriority {
  return entry.record?.priority ?? DEFAULT_PRIORITY
}

export function valueOf(entry: CrmEntry): number {
  return entry.record?.dealValue ?? 0
}

export function labelIdsOf(entry: CrmEntry): string[] {
  return entry.record?.labelIds ?? []
}

export function displayName(entry: CrmEntry): string {
  const fromRecord = entry.record?.contactName?.trim()
  if (fromRecord) return fromRecord
  const fromLead = entry.leadName?.trim()
  if (fromLead) return fromLead
  const local = entry.email.split('@')[0] ?? entry.email
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function displayCompany(entry: CrmEntry): string | null {
  const fromRecord = entry.record?.companyName?.trim()
  if (fromRecord) return fromRecord
  const fromLead = entry.leadCompany?.trim()
  if (fromLead) return fromLead
  const domain = entry.email.split('@')[1]
  if (!domain) return null
  const base = domain.split('.')[0]
  if (!base || base.length < 2) return null
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function initialsOf(entry: CrmEntry): string {
  const name = displayName(entry)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const CURRENCY = new Intl.NumberFormat('nl-NL', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number): string {
  return CURRENCY.format(value)
}

const DATE_SHORT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const DATE_TIME = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return DATE_SHORT.format(d)
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return DATE_TIME.format(d)
}

/** YYYY-MM-DD in lokale tijd — voor <input type="date"> en vergelijkingen. */
export function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayInput(): string {
  return toDateInput(new Date().toISOString())
}

/** Vervaldag-status van de volgende actie. */
export type DueState = 'none' | 'overdue' | 'today' | 'upcoming'

export function dueStateOf(entry: CrmEntry, today: string): DueState {
  const due = entry.record?.nextActionAt
  if (!due) return 'none'
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return 'upcoming'
}

export function matchesSearch(entry: CrmEntry, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    entry.email,
    entry.leadName,
    entry.leadCompany,
    entry.record?.contactName,
    entry.record?.companyName,
    entry.record?.jobTitle,
    entry.record?.phone,
    entry.record?.ownerName,
    entry.record?.notes,
    entry.record?.nextAction,
    entry.replySubject,
  ]
  return haystack.some((v) => v && v.toLowerCase().includes(q))
}

export function csvEscape(value: string): string {
  if (/[",\n;]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
