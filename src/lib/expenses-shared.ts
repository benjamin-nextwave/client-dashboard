// Client-veilige types, labels en rekenregels voor de uitgaves. Bevat geen
// server-only imports, zodat de pagina (server) en de tabel (client) hier
// allebei uit kunnen putten. De datalaag staat in lib/data/expenses.ts.

export const CADENCES = ['eenmalig', 'maand', 'kwartaal', 'jaar'] as const
export type Cadence = (typeof CADENCES)[number]

export const CADENCE_LABELS: Record<Cadence, string> = {
  eenmalig: 'Eenmalig',
  maand: 'Per maand',
  kwartaal: 'Per kwartaal',
  jaar: 'Per jaar',
}

/** Korte vorm achter een bedrag: "€297 p/m". */
export const CADENCE_SUFFIX: Record<Cadence, string> = {
  eenmalig: 'eenmalig',
  maand: 'p/m',
  kwartaal: 'p/kw',
  jaar: 'p/j',
}

export const EXPENSE_STATUSES = ['actief', 'opgezegd', 'gestopt'] as const
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number]

export const STATUS_LABELS: Record<ExpenseStatus, string> = {
  actief: 'Actief',
  opgezegd: 'Opgezegd',
  gestopt: 'Gestopt',
}

export const VERDICTS = ['goed', 'kan_beter', 'fout'] as const
export type Verdict = (typeof VERDICTS)[number]

export const VERDICT_LABELS: Record<Verdict, string> = {
  goed: 'Goed',
  kan_beter: 'Kan beter',
  fout: 'Fout',
}

export const EXPENSE_ACTIONS = ['houden', 'opzeggen', 'overstappen', 'verlagen'] as const
export type ExpenseAction = (typeof EXPENSE_ACTIONS)[number]

export const ACTION_LABELS: Record<ExpenseAction, string> = {
  houden: 'Houden',
  opzeggen: 'Opzeggen',
  overstappen: 'Overstappen',
  verlagen: 'Verlagen',
}

export const EXPENSE_SOURCES = ['handmatig', 'chat', 'csv'] as const
export type ExpenseSource = (typeof EXPENSE_SOURCES)[number]

/**
 * Suggesties, geen keurslijf: de kolom is vrije tekst, zodat een nieuwe soort
 * kosten geen migratie kost. Deze lijst vult alleen de keuzelijst en de
 * volgorde waarin categorieën op de pagina staan.
 */
export const EXPENSE_CATEGORIES = [
  'software',
  'mailboxen',
  'data',
  'bank',
  'kantoor',
  'marketing',
  'personeel',
  'uitbesteed',
  'overig',
] as const

export const CATEGORY_LABELS: Record<string, string> = {
  software: 'Software',
  mailboxen: 'Mailboxen',
  data: 'Data & leads',
  bank: 'Bankkosten',
  kantoor: 'Kantoor',
  marketing: 'Marketing',
  personeel: 'Personeel',
  uitbesteed: 'Uitbesteed werk',
  overig: 'Overig',
}

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value.charAt(0).toUpperCase() + value.slice(1)
}

/** Klant om een uitgave aan te hangen, bijvoorbeeld mailboxen per klant. */
export interface ExpenseClientOption {
  id: string
  name: string
}

export interface Expense {
  id: string
  supplier: string
  description: string
  category: string
  /** Exclusief btw, net als aan de commissiekant. */
  amountCents: number
  cadence: Cadence
  startedOn: string | null
  endedOn: string | null
  status: ExpenseStatus
  verdict: Verdict | null
  verdictReason: string | null
  action: ExpenseAction | null
  actionNote: string | null
  clientId: string | null
  clientName: string | null
  source: ExpenseSource
  externalRef: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Wat deze post per maand kost. Een eenmalige uitgave telt hier niet mee: die
 * hoort in het periodetotaal, niet in de vaste lasten. Een jaarabonnement wordt
 * gedeeld door twaalf, zodat alles op dezelfde meetlat ligt.
 */
export function monthlyCents(expense: Pick<Expense, 'amountCents' | 'cadence'>): number {
  switch (expense.cadence) {
    case 'maand':
      return expense.amountCents
    case 'kwartaal':
      return Math.round(expense.amountCents / 3)
    case 'jaar':
      return Math.round(expense.amountCents / 12)
    case 'eenmalig':
      return 0
  }
}

export function yearlyCents(expense: Pick<Expense, 'amountCents' | 'cadence'>): number {
  switch (expense.cadence) {
    case 'maand':
      return expense.amountCents * 12
    case 'kwartaal':
      return expense.amountCents * 4
    case 'jaar':
      return expense.amountCents
    case 'eenmalig':
      return 0
  }
}

/**
 * Telt alleen mee in de vaste lasten wat we nu ook echt betalen. Opgezegd maar
 * nog lopend telt mee tot de einddatum: tot die dag gaat het geld eruit.
 */
export function isRunning(expense: Pick<Expense, 'status' | 'endedOn'>, today: string): boolean {
  if (expense.status === 'gestopt') return false
  if (expense.endedOn && expense.endedOn < today) return false
  return true
}

/** Vaste lasten per maand over de posten die nu lopen. */
export function totalMonthlyCents(expenses: Expense[], today: string): number {
  return expenses.reduce(
    (sum, e) => (isRunning(e, today) ? sum + monthlyCents(e) : sum),
    0
  )
}

/** Wat er per maand vrijvalt als alles met actie "opzeggen" ook echt stopt. */
export function potentialSavingsCents(expenses: Expense[], today: string): number {
  return expenses.reduce((sum, e) => {
    if (!isRunning(e, today)) return sum
    if (e.action !== 'opzeggen' && e.action !== 'overstappen' && e.action !== 'verlagen') return sum
    return sum + monthlyCents(e)
  }, 0)
}

export function isCadence(value: unknown): value is Cadence {
  return typeof value === 'string' && (CADENCES as readonly string[]).includes(value)
}

export function isStatus(value: unknown): value is ExpenseStatus {
  return typeof value === 'string' && (EXPENSE_STATUSES as readonly string[]).includes(value)
}

export function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && (VERDICTS as readonly string[]).includes(value)
}

export function isAction(value: unknown): value is ExpenseAction {
  return typeof value === 'string' && (EXPENSE_ACTIONS as readonly string[]).includes(value)
}

export function isSource(value: unknown): value is ExpenseSource {
  return typeof value === 'string' && (EXPENSE_SOURCES as readonly string[]).includes(value)
}
