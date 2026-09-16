'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuroCents } from '@/lib/commissions-shared'
import {
  ACTION_LABELS,
  CADENCES,
  CADENCE_LABELS,
  CADENCE_SUFFIX,
  EXPENSE_ACTIONS,
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  STATUS_LABELS,
  VERDICTS,
  VERDICT_LABELS,
  categoryLabel,
  isRunning,
  monthlyCents,
  potentialSavingsCents,
  totalMonthlyCents,
  yearlyCents,
  type Expense,
  type ExpenseClientOption,
} from '@/lib/expenses-shared'
import {
  deleteExpenseAction,
  saveExpenseAction,
  saveNotesAction,
  setPlanAction,
  setStatusAction,
  setVerdictAction,
} from '../actions'

/**
 * De uitgaves, gesorteerd op wat ze per maand kosten.
 *
 * De pagina is gebouwd om één vraag te beantwoorden: waar gaat het geld heen en
 * wat kan eruit. Vandaar dat het maandbedrag de sorteersleutel is en niet de
 * datum, en dat oordeel en actie in de rij zelf staan — een besparingsronde is
 * een lijst langslopen, niet per post een dialoog openen.
 */

type Filter = 'lopend' | 'beoordelen' | 'besparen' | 'alles'

const FILTER_LABELS: Record<Filter, string> = {
  lopend: 'Lopend',
  beoordelen: 'Te beoordelen',
  besparen: 'Actie nodig',
  alles: 'Alles',
}

const VERDICT_TONE: Record<string, string> = {
  goed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  kan_beter: 'bg-amber-50 text-amber-700 ring-amber-200',
  fout: 'bg-rose-50 text-rose-700 ring-rose-200',
}

function formatDay(date: string | null): string {
  if (!date) return '—'
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: '2-digit' }).format(
    parsed
  )
}

export function ExpensesView({
  expenses,
  clients,
  today,
}: {
  expenses: Expense[]
  clients: ExpenseClientOption[]
  today: string
}) {
  const [filter, setFilter] = useState<Filter>('lopend')
  const [categorie, setCategorie] = useState<string>('alles')
  const [formOpen, setFormOpen] = useState(false)
  const [bewerk, setBewerk] = useState<Expense | null>(null)

  const lopend = useMemo(() => expenses.filter((e) => isRunning(e, today)), [expenses, today])

  const maandTotaal = totalMonthlyCents(expenses, today)
  const jaarTotaal = lopend.reduce((sum, e) => sum + yearlyCents(e), 0)
  const besparing = potentialSavingsCents(expenses, today)
  const onbeoordeeld = lopend.filter((e) => e.verdict === null).length

  const perCategorie = useMemo(() => {
    const totalen = new Map<string, number>()
    for (const e of lopend) {
      const maand = monthlyCents(e)
      if (maand === 0) continue
      totalen.set(e.category, (totalen.get(e.category) ?? 0) + maand)
    }
    return [...totalen.entries()].sort((a, b) => b[1] - a[1])
  }, [lopend])

  const categorieën = useMemo(
    () => [...new Set(expenses.map((e) => e.category))].sort(),
    [expenses]
  )

  const zichtbaar = useMemo(() => {
    let rijen = expenses
    if (filter === 'lopend') rijen = rijen.filter((e) => isRunning(e, today))
    if (filter === 'beoordelen') {
      rijen = rijen.filter((e) => isRunning(e, today) && e.verdict === null)
    }
    if (filter === 'besparen') {
      rijen = rijen.filter((e) => e.action !== null && e.action !== 'houden')
    }
    if (categorie !== 'alles') rijen = rijen.filter((e) => e.category === categorie)

    // Vaste lasten bovenaan op maandbedrag; eenmalige posten daaronder op datum,
    // want die hebben geen maandbedrag om op te sorteren.
    return [...rijen].sort((a, b) => {
      const ma = monthlyCents(a)
      const mb = monthlyCents(b)
      if (ma !== mb) return mb - ma
      return (b.startedOn ?? '').localeCompare(a.startedOn ?? '')
    })
  }, [expenses, filter, categorie, today])

  function sluitFormulier() {
    setFormOpen(false)
    setBewerk(null)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Vaste lasten" value={formatEuroCents(maandTotaal)} hint="per maand" />
        <StatTile label="Op jaarbasis" value={formatEuroCents(jaarTotaal)} hint="lopende posten" />
        <StatTile
          label="Mogelijke besparing"
          value={formatEuroCents(besparing)}
          hint="per maand, als de acties doorgaan"
          tone={besparing > 0 ? 'ok' : undefined}
        />
        <StatTile
          label="Nog te beoordelen"
          value={String(onbeoordeeld)}
          hint={onbeoordeeld === 1 ? 'lopende post' : 'lopende posten'}
          tone={onbeoordeeld > 0 ? 'warn' : undefined}
        />
      </div>

      {perCategorie.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {perCategorie.map(([naam, cents]) => (
            <button
              key={naam}
              type="button"
              onClick={() => setCategorie(categorie === naam ? 'alles' : naam)}
              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${
                categorie === naam
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {categoryLabel(naam)}{' '}
              <span className="tabular-nums opacity-60">{formatEuroCents(cents)}</span>
            </button>
          ))}
        </div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {categorie !== 'alles' && (
            <button
              type="button"
              onClick={() => setCategorie('alles')}
              className="text-[11px] font-semibold text-gray-500 underline hover:text-gray-900"
            >
              Filter op {categoryLabel(categorie)} wissen
            </button>
          )}
          <button
            type="button"
            onClick={() => (formOpen ? sluitFormulier() : setFormOpen(true))}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800"
          >
            {formOpen ? 'Annuleren' : 'Uitgave toevoegen'}
          </button>
        </div>
      </header>

      {formOpen && (
        <UitgaveFormulier
          key={bewerk?.id ?? 'nieuw'}
          expense={bewerk}
          clients={clients}
          categorieën={categorieën}
          onKlaar={sluitFormulier}
        />
      )}

      {zichtbaar.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-xs text-gray-500">
          {expenses.length === 0
            ? 'Er staat nog niets in. Voeg een post toe met de knop hierboven, of vraag in de chat om /uitgaves.'
            : 'Niets in dit filter.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-4 py-2">Post</th>
                <th className="px-4 py-2">Categorie</th>
                <th className="px-4 py-2 text-right">Bedrag excl.</th>
                <th className="px-4 py-2 text-right">Per maand</th>
                <th className="px-4 py-2">Oordeel</th>
                <th className="px-4 py-2">Actie</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {zichtbaar.map((expense) => (
                <UitgaveRij
                  key={expense.id}
                  expense={expense}
                  today={today}
                  onBewerk={() => {
                    setBewerk(expense)
                    setFormOpen(true)
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone?: 'ok' | 'warn'
}) {
  const kleur =
    tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900'
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${kleur}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{hint}</div>
    </div>
  )
}

function UitgaveRij({
  expense,
  today,
  onBewerk,
}: {
  expense: Expense
  today: string
  onBewerk: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [bevestigWissen, setBevestigWissen] = useState(false)

  const loopt = isRunning(expense, today)
  const maand = monthlyCents(expense)

  function voerUit(werk: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await werk()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <tr className={`align-middle ${loopt ? '' : 'opacity-60'}`}>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-900">{expense.supplier}</span>
            {expense.status !== 'actief' && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                {STATUS_LABELS[expense.status].toLowerCase()}
                {expense.endedOn ? ` ${formatDay(expense.endedOn)}` : ''}
              </span>
            )}
          </div>
          {expense.description && (
            <div className="mt-0.5 max-w-sm truncate text-[11px] text-gray-500">
              {expense.description}
            </div>
          )}
          <div className="mt-0.5 text-[10px] text-gray-400">
            {expense.cadence === 'eenmalig'
              ? formatDay(expense.startedOn)
              : `sinds ${formatDay(expense.startedOn)}`}
            {expense.clientName ? ` · ${expense.clientName}` : ''}
          </div>
          {error && <div className="mt-0.5 text-[10px] font-medium text-amber-700">{error}</div>}
        </td>

        <td className="px-4 py-2.5">
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
            {categoryLabel(expense.category)}
          </span>
        </td>

        <td className="px-4 py-2.5 text-right text-[11px] font-semibold tabular-nums text-gray-900">
          {formatEuroCents(expense.amountCents)}
          <div className="text-[10px] font-normal text-gray-400">
            {CADENCE_SUFFIX[expense.cadence]}
          </div>
        </td>

        <td className="px-4 py-2.5 text-right text-[11px] font-semibold tabular-nums text-gray-700">
          {maand === 0 ? '—' : formatEuroCents(maand)}
        </td>

        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1">
            {VERDICTS.map((v) => (
              <button
                key={v}
                type="button"
                disabled={pending}
                onClick={() =>
                  voerUit(() =>
                    setVerdictAction(
                      expense.id,
                      expense.verdict === v ? null : v,
                      expense.verdictReason
                    )
                  )
                }
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 transition-colors disabled:opacity-50 ${
                  expense.verdict === v
                    ? VERDICT_TONE[v]
                    : 'bg-white text-gray-400 ring-gray-200 hover:text-gray-700'
                }`}
              >
                {VERDICT_LABELS[v]}
              </button>
            ))}
          </div>
        </td>

        <td className="px-4 py-2.5">
          <select
            value={expense.action ?? ''}
            disabled={pending}
            onChange={(e) =>
              voerUit(() =>
                setPlanAction(expense.id, e.target.value === '' ? null : e.target.value, expense.actionNote)
              )
            }
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 disabled:opacity-50"
          >
            <option value="">Nog niets</option>
            {EXPENSE_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </td>

        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] font-semibold text-gray-500 underline hover:text-gray-900"
          >
            {open ? 'Sluiten' : 'Details'}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={7} className="bg-gray-50/70 px-4 py-4">
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <Toelichting expense={expense} onKlaar={() => router.refresh()} />

              <div className="space-y-2 text-[11px]">
                <div className="font-semibold uppercase tracking-wide text-gray-400">Beheer</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={expense.status}
                    disabled={pending}
                    onChange={(e) => voerUit(() => setStatusAction(expense.id, e.target.value))}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 font-semibold text-gray-700 disabled:opacity-50"
                  >
                    {EXPENSE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={onBewerk}
                    className="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:border-gray-300"
                  >
                    Bewerken
                  </button>
                  {bevestigWissen ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => voerUit(() => deleteExpenseAction(expense.id))}
                      className="rounded-md bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      Zeker weten?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setBevestigWissen(true)}
                      className="rounded-md border border-gray-200 bg-white px-2.5 py-1 font-semibold text-rose-600 hover:border-rose-200"
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  Bron: {expense.source} · bijgewerkt {formatDay(expense.updatedAt.slice(0, 10))}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/** De drie tekstvelden bij een post: waarom dit oordeel, wat doen we, en de rest. */
function Toelichting({ expense, onKlaar }: { expense: Expense; onKlaar: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [bewaard, setBewaard] = useState(false)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const leeg = (key: string) => {
      const value = String(data.get(key) ?? '').trim()
      return value.length > 0 ? value : null
    }

    setError(null)
    setBewaard(false)
    startTransition(async () => {
      const result = await saveNotesAction(
        expense.id,
        leeg('verdictReason'),
        leeg('actionNote'),
        leeg('notes')
      )
      if (result.error) {
        setError(result.error)
        return
      }
      setBewaard(true)
      onKlaar()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Waarom dit oordeel
          </span>
          <textarea
            name="verdictReason"
            rows={2}
            defaultValue={expense.verdictReason ?? ''}
            placeholder="bv. mailboxen van een klant die in juli gestopt is"
            className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-800"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Wat gaan we doen
          </span>
          <textarea
            name="actionNote"
            rows={2}
            defaultValue={expense.actionNote ?? ''}
            placeholder="bv. opzeggen vóór 1 nov, anders loopt hij een jaar door"
            className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-800"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Notitie
        </span>
        <textarea
          name="notes"
          rows={2}
          defaultValue={expense.notes ?? ''}
          className="mt-1 block w-full rounded-md border border-gray-200 px-2 py-1.5 text-[11px] text-gray-800"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-gray-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Opslaan…' : 'Opslaan'}
        </button>
        {bewaard && !pending && <span className="text-[11px] text-emerald-600">Bewaard</span>}
        {error && <span className="text-[11px] text-rose-600">{error}</span>}
      </div>
    </form>
  )
}

function UitgaveFormulier({
  expense,
  clients,
  categorieën,
  onKlaar,
}: {
  expense: Expense | null
  clients: ExpenseClientOption[]
  categorieën: string[]
  onKlaar: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const opties = [...new Set([...EXPENSE_CATEGORIES, ...categorieën])]

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    setError(null)
    startTransition(async () => {
      const result = await saveExpenseAction(data)
      if (result.error) {
        setError(result.error)
        return
      }
      onKlaar()
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
    >
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Veld label="Leverancier">
          <input
            name="supplier"
            required
            defaultValue={expense?.supplier ?? ''}
            placeholder="Instantly"
            className={INPUT}
          />
        </Veld>

        <Veld label="Wat is het">
          <input
            name="description"
            defaultValue={expense?.description ?? ''}
            placeholder="Hypergrowth, 15 mailboxen"
            className={INPUT}
          />
        </Veld>

        <Veld label="Categorie">
          <input
            name="category"
            list="uitgave-categorieen"
            defaultValue={expense?.category ?? 'software'}
            className={INPUT}
          />
          <datalist id="uitgave-categorieen">
            {opties.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </datalist>
        </Veld>

        <Veld label="Bedrag excl. btw">
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={expense ? (expense.amountCents / 100).toFixed(2).replace('.', ',') : ''}
            placeholder="297,00"
            className={INPUT}
          />
        </Veld>

        <Veld label="Hoe vaak">
          <select name="cadence" defaultValue={expense?.cadence ?? 'maand'} className={INPUT}>
            {CADENCES.map((c) => (
              <option key={c} value={c}>
                {CADENCE_LABELS[c]}
              </option>
            ))}
          </select>
        </Veld>

        <Veld label="Status">
          <select name="status" defaultValue={expense?.status ?? 'actief'} className={INPUT}>
            {EXPENSE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </Veld>

        <Veld label="Sinds / op">
          <input
            type="date"
            name="startedOn"
            defaultValue={expense?.startedOn ?? ''}
            className={INPUT}
          />
        </Veld>

        <Veld label="Tot en met">
          <input type="date" name="endedOn" defaultValue={expense?.endedOn ?? ''} className={INPUT} />
        </Veld>

        <Veld label="Klant (optioneel)">
          <select name="clientId" defaultValue={expense?.clientId ?? ''} className={INPUT}>
            <option value="">Geen</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Veld>

        <div className="sm:col-span-2 lg:col-span-3">
          <Veld label="Notitie">
            <input name="notes" defaultValue={expense?.notes ?? ''} className={INPUT} />
          </Veld>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {pending ? 'Opslaan…' : expense ? 'Wijziging opslaan' : 'Uitgave toevoegen'}
        </button>
        <button
          type="button"
          onClick={onKlaar}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900"
        >
          Annuleren
        </button>
        {error && <span className="text-xs text-rose-600">{error}</span>}
      </div>
    </form>
  )
}

const INPUT =
  'mt-1 block w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-gray-400 focus:outline-none'

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      {children}
    </label>
  )
}
