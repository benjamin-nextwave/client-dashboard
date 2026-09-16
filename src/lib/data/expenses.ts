import { createAdminClient } from '@/lib/supabase/admin'
import {
  isAction,
  isCadence,
  isSource,
  isStatus,
  isVerdict,
  type Expense,
  type ExpenseClientOption,
} from '@/lib/expenses-shared'

export type { ExpenseClientOption }

/**
 * De uitgaves zoals de pagina ze nodig heeft.
 *
 * Bron is onze eigen tabel `operator_expenses` en niet Rompslomp: de
 * boekhouding wordt niet bijgehouden, dus een overzicht dat daarop leunt loopt
 * weken achter. Wat hier staat, staat er omdat wij het erin hebben gezet —
 * vanuit de chat (skill `uitgaves`) of via het formulier op de pagina.
 *
 * Waarden die niet door de controle komen worden niet stilzwijgend gladgestreken
 * maar op een veilige standaard gezet: een onbekende cadence telt als eenmalig
 * en telt dus níét mee in de vaste lasten. Een verzonnen maandbedrag is erger
 * dan een bedrag dat ontbreekt.
 */

type ExpenseRow = {
  id: string
  supplier: string | null
  description: string | null
  category: string | null
  amount_cents: number | null
  cadence: string | null
  started_on: string | null
  ended_on: string | null
  status: string | null
  verdict: string | null
  verdict_reason: string | null
  action: string | null
  action_note: string | null
  client_id: string | null
  source: string | null
  external_ref: string | null
  notes: string | null
  created_at: string
  updated_at: string
  clients: { company_name: string | null } | null
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    supplier: row.supplier ?? '',
    description: row.description ?? '',
    category: row.category ?? 'overig',
    amountCents: typeof row.amount_cents === 'number' ? row.amount_cents : 0,
    cadence: isCadence(row.cadence) ? row.cadence : 'eenmalig',
    startedOn: row.started_on,
    endedOn: row.ended_on,
    status: isStatus(row.status) ? row.status : 'actief',
    verdict: isVerdict(row.verdict) ? row.verdict : null,
    verdictReason: row.verdict_reason,
    action: isAction(row.action) ? row.action : null,
    actionNote: row.action_note,
    clientId: row.client_id,
    clientName: row.clients?.company_name ?? null,
    source: isSource(row.source) ? row.source : 'handmatig',
    externalRef: row.external_ref,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getExpenses(): Promise<Expense[]> {
  const supabase = createAdminClient()

  // Duurste eerst binnen de lopende posten is de volgorde waarin je wilt kijken
  // als het doel besparen is; de tabel zelf sorteert verder op wat je aanklikt.
  const { data, error } = await supabase
    .from('operator_expenses')
    .select(
      'id, supplier, description, category, amount_cents, cadence, started_on, ended_on, status, verdict, verdict_reason, action, action_note, client_id, source, external_ref, notes, created_at, updated_at, clients:client_id (company_name)'
    )
    .order('amount_cents', { ascending: false })

  if (error) {
    console.error('[uitgaves] ophalen mislukt:', error.message)
    return []
  }

  return ((data ?? []) as unknown as ExpenseRow[]).map(toExpense)
}

/** Klanten om een uitgave aan te hangen, bijvoorbeeld mailboxen per klant. */
export async function getExpenseClientOptions(): Promise<ExpenseClientOption[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name')
    .order('company_name')

  if (error) {
    console.error('[uitgaves] klanten ophalen mislukt:', error.message)
    return []
  }

  return ((data ?? []) as { id: string; company_name: string | null }[])
    .filter((row) => row.company_name)
    .map((row) => ({ id: row.id, name: row.company_name as string }))
}
