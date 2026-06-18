'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  formatEuroCents,
  parseEuroToCents,
  type CommissionCategory,
} from '@/lib/commissions-shared'
import {
  addCommissionCategory,
  updateCommissionCategory,
  deleteCommissionCategory,
} from '../actions'

interface CategoryConfigProps {
  clientId: string
  categories: CommissionCategory[]
  standardCategories: string[]
}

export function CategoryConfig({ clientId, categories, standardCategories }: CategoryConfigProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')

  const existingNames = new Set(categories.map((c) => c.name.toLowerCase()))
  const availableStandard = standardCategories.filter((s) => !existingNames.has(s.toLowerCase()))

  const add = (name: string, priceInput: string) => {
    const cents = parseEuroToCents(priceInput || '0') ?? 0
    setError(null)
    startTransition(async () => {
      const res = await addCommissionCategory(clientId, name, cents)
      if (res.error) setError(res.error)
      else {
        setNewName('')
        setNewPrice('')
        router.refresh()
      }
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">Categorieën &amp; prijzen</h2>
      <p className="mt-1 text-xs text-gray-500">
        Stel per categorie de commissieprijs per lead in. Alleen toegevoegde categorieën verschijnen in de avondcontrole.
      </p>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      {/* Bestaande categorieën */}
      <div className="mt-4 space-y-2">
        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
            Nog geen categorieën ingesteld voor deze klant.
          </div>
        ) : (
          categories.map((cat) => (
            <CategoryRow key={cat.id} clientId={clientId} category={cat} onError={setError} />
          ))
        )}
      </div>

      {/* Standaard snelkeuzes */}
      {availableStandard.length > 0 && (
        <div className="mt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Standaardcategorieën toevoegen
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableStandard.map((name) => (
              <button
                key={name}
                type="button"
                disabled={isPending}
                onClick={() => add(name, '0')}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {name}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400">
            Toegevoegd met prijs € 0,00 — pas de prijs daarna aan.
          </p>
        </div>
      )}

      {/* Eigen categorie */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Eigen categorie toevoegen</div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam van de categorie"
              className="w-full rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <div className="w-32">
            <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50/40 px-2 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-100">
              <span className="text-sm text-gray-400">€</span>
              <input
                type="text"
                inputMode="decimal"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0,00"
                className="w-full bg-transparent px-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={isPending || newName.trim().length === 0}
            onClick={() => add(newName, newPrice)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Toevoegen
          </button>
        </div>
      </div>
    </section>
  )
}

function CategoryRow({
  clientId,
  category,
  onError,
}: {
  clientId: string
  category: CommissionCategory
  onError: (msg: string | null) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(category.name)
  const [price, setPrice] = useState((category.priceCents / 100).toFixed(2).replace('.', ','))

  const dirty =
    name.trim() !== category.name ||
    (parseEuroToCents(price) ?? -1) !== category.priceCents

  const save = () => {
    const cents = parseEuroToCents(price)
    if (cents === null) {
      onError('Ongeldige prijs.')
      return
    }
    onError(null)
    startTransition(async () => {
      const res = await updateCommissionCategory(clientId, category.id, name, cents)
      if (res.error) onError(res.error)
      else router.refresh()
    })
  }

  const remove = () => {
    onError(null)
    startTransition(async () => {
      const res = await deleteCommissionCategory(clientId, category.id)
      if (res.error) onError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/40 px-3 py-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-[180px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium text-gray-900 focus:border-indigo-300 focus:bg-white focus:outline-none"
      />
      <div className="flex w-28 items-center rounded-lg border border-gray-200 bg-white px-2">
        <span className="text-sm text-gray-400">€</span>
        <input
          type="text"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full bg-transparent px-1 py-1.5 text-sm text-gray-900 focus:outline-none"
        />
      </div>
      <span className="hidden w-24 text-right text-xs text-gray-400 sm:block">
        {formatEuroCents(category.priceCents)}/lead
      </span>
      <button
        type="button"
        disabled={!dirty || isPending}
        onClick={save}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Opslaan
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={remove}
        aria-label="Categorie verwijderen"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
        </svg>
      </button>
    </div>
  )
}
