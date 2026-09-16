'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseEuroToCents } from '@/lib/commissions-shared'
import { isAction, isCadence, isStatus, isVerdict } from '@/lib/expenses-shared'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

const PAGE = '/admin/financieel/uitgaves'

export type ActionResult = { error?: string }

function readText(formData: FormData, key: string): string | null {
  const raw = formData.get(key)
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function readDate(formData: FormData, key: string): string | null {
  const value = readText(formData, key)
  return value && DATE_RE.test(value) ? value : null
}

/**
 * Eén regel opslaan. Zonder `id` is het een nieuwe post, met `id` een wijziging
 * van een bestaande. Het oordeel en de actie worden hier niet aangeraakt: die
 * hebben hun eigen knoppen in de tabel, zodat een bewerking van het bedrag niet
 * per ongeluk een eerder oordeel wist.
 */
export async function saveExpenseAction(formData: FormData): Promise<ActionResult> {
  const supplier = readText(formData, 'supplier')
  if (!supplier) return { error: 'Vul een leverancier in.' }

  const amountCents = parseEuroToCents(String(formData.get('amount') ?? ''))
  if (amountCents === null) return { error: 'Vul een geldig bedrag in (excl. btw).' }

  const cadenceRaw = formData.get('cadence')
  if (!isCadence(cadenceRaw)) return { error: 'Kies hoe vaak deze kosten terugkomen.' }

  const statusRaw = formData.get('status')
  const status = isStatus(statusRaw) ? statusRaw : 'actief'

  const row = {
    supplier,
    description: readText(formData, 'description') ?? '',
    category: readText(formData, 'category') ?? 'overig',
    amount_cents: amountCents,
    cadence: cadenceRaw,
    started_on: readDate(formData, 'startedOn'),
    ended_on: readDate(formData, 'endedOn'),
    status,
    client_id: readText(formData, 'clientId'),
    notes: readText(formData, 'notes'),
    updated_at: new Date().toISOString(),
  }

  const supabase = createAdminClient()
  const id = readText(formData, 'id')

  const { error } = id
    ? await supabase.from('operator_expenses').update(row).eq('id', id)
    : await supabase.from('operator_expenses').insert({ ...row, source: 'handmatig' })

  if (error) return { error: error.message }

  revalidatePath(PAGE)
  return {}
}

/** Het oordeel over een post: goed, kan beter, fout, of terug naar onbeoordeeld. */
export async function setVerdictAction(
  id: string,
  verdict: string | null,
  reason: string | null
): Promise<ActionResult> {
  if (verdict !== null && !isVerdict(verdict)) return { error: 'Onbekend oordeel.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_expenses')
    .update({
      verdict,
      verdict_reason: verdict === null ? null : reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(PAGE)
  return {}
}

/** Wat we met een post gaan doen: houden, opzeggen, overstappen of verlagen. */
export async function setPlanAction(
  id: string,
  action: string | null,
  note: string | null
): Promise<ActionResult> {
  if (action !== null && !isAction(action)) return { error: 'Onbekende actie.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_expenses')
    .update({
      action,
      action_note: action === null ? null : note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(PAGE)
  return {}
}

/**
 * Stopzetten of weer aanzetten. Bij 'gestopt' zonder einddatum wordt vandaag
 * ingevuld: zonder datum is later niet meer te zien wanneer het geld ophield,
 * en dat is precies wat je bij een besparing wilt kunnen aanwijzen.
 */
export async function setStatusAction(id: string, status: string): Promise<ActionResult> {
  if (!isStatus(status)) return { error: 'Onbekende status.' }

  const supabase = createAdminClient()

  const { data, error: readError } = await supabase
    .from('operator_expenses')
    .select('ended_on')
    .eq('id', id)
    .maybeSingle()

  if (readError) return { error: readError.message }

  const endedOn = (data as { ended_on: string | null } | null)?.ended_on ?? null
  const today = new Date().toISOString().slice(0, 10)

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (status === 'gestopt' && !endedOn) patch.ended_on = today
  if (status === 'actief') patch.ended_on = null

  const { error } = await supabase.from('operator_expenses').update(patch).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(PAGE)
  return {}
}

/**
 * De drie tekstvelden bij een post in één keer. Ze horen bij elkaar in het
 * gesprek over besparen — waarom vind ik hier iets van, en wat gaan we doen —
 * en scheiden zou drie knoppen onder elkaar opleveren die alle drie hetzelfde
 * lijken te doen.
 */
export async function saveNotesAction(
  id: string,
  verdictReason: string | null,
  actionNote: string | null,
  notes: string | null
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_expenses')
    .update({
      verdict_reason: verdictReason,
      action_note: actionNote,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(PAGE)
  return {}
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('operator_expenses').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(PAGE)
  return {}
}
