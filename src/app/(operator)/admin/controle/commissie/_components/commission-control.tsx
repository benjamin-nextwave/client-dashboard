'use client'

import { useRef, useState, useTransition } from 'react'
import { amsterdamDateString, formatEuroCents, type CommissionCategory } from '@/lib/commissions-shared'
import { addCommissionLeads, type CommissionLeadInput } from '@/app/(operator)/admin/commissies/actions'

interface CommissionControlClient {
  id: string
  companyName: string
}

interface CommissionControlProps {
  clients: CommissionControlClient[]
  categoriesByClient: Record<string, CommissionCategory[]>
  campaignNames: string[]
}

interface Block {
  key: number
  leadEmail: string
  clientId: string
  categoryId: string
  campaignName: string
  date: string
}

const FIELD_CLASS =
  'w-full rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100'
const LABEL_CLASS = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500'

export function CommissionControl({ clients, categoriesByClient, campaignNames }: CommissionControlProps) {
  const keyCounter = useRef(1)
  const makeBlock = (clientId = ''): Block => ({
    key: keyCounter.current++,
    leadEmail: '',
    clientId,
    categoryId: '',
    campaignName: '',
    date: amsterdamDateString(),
  })

  const [blocks, setBlocks] = useState<Block[]>(() => [makeBlock()])
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const addBlock = () => {
    setFeedback(null)
    setBlocks((prev) => {
      const lastClientId = prev.length > 0 ? prev[prev.length - 1].clientId : ''
      return [...prev, makeBlock(lastClientId)]
    })
  }

  const removeBlock = (key: number) => {
    setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.key !== key)))
  }

  const updateBlock = (key: number, patch: Partial<Block>) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.key !== key) return b
        const next = { ...b, ...patch }
        // Als de klant verandert, is de gekozen categorie niet meer geldig.
        if (patch.clientId !== undefined && patch.clientId !== b.clientId) {
          next.categoryId = ''
        }
        return next
      })
    )
  }

  const filledCount = blocks.filter(
    (b) => b.leadEmail.trim() && b.clientId && b.categoryId && b.date
  ).length

  const handleSave = () => {
    setFeedback(null)
    const rows: CommissionLeadInput[] = blocks.map((b) => ({
      leadEmail: b.leadEmail,
      clientId: b.clientId,
      categoryId: b.categoryId,
      campaignName: b.campaignName,
      date: b.date,
    }))
    startTransition(async () => {
      const result = await addCommissionLeads(rows)
      if (result.error) {
        setFeedback({ tone: 'error', text: result.error })
        return
      }
      setFeedback({
        tone: 'success',
        text: `${result.inserted ?? 0} lead${result.inserted === 1 ? '' : 's'} opgeslagen.`,
      })
      setBlocks([makeBlock()])
    })
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={addBlock}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-4 text-sm font-semibold text-indigo-600 transition-all hover:border-indigo-300 hover:bg-indigo-50"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Lead toevoegen
      </button>

      <div className="space-y-3">
        {blocks.map((block, index) => {
          const categories = categoriesByClient[block.clientId] ?? []
          const selectedCat = categories.find((c) => c.id === block.categoryId)
          return (
            <div
              key={block.key}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  Lead {index + 1}
                </span>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBlock(block.key)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 transition-colors hover:text-rose-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    Verwijderen
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <label className={LABEL_CLASS}>Mailadres lead</label>
                  <input
                    type="email"
                    value={block.leadEmail}
                    onChange={(e) => updateBlock(block.key, { leadEmail: e.target.value })}
                    placeholder="naam@bedrijf.nl"
                    className={FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Klant</label>
                  <select
                    value={block.clientId}
                    onChange={(e) => updateBlock(block.key, { clientId: e.target.value })}
                    className={FIELD_CLASS}
                  >
                    <option value="">Kies klant…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Categorisatie</label>
                  <select
                    value={block.categoryId}
                    onChange={(e) => updateBlock(block.key, { categoryId: e.target.value })}
                    disabled={!block.clientId}
                    className={`${FIELD_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <option value="">
                      {block.clientId
                        ? categories.length > 0
                          ? 'Kies categorie…'
                          : 'Geen categorieën ingesteld'
                        : 'Kies eerst een klant'}
                    </option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} · {formatEuroCents(cat.priceCents)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={LABEL_CLASS}>Campagne</label>
                  <input
                    type="text"
                    value={block.campaignName}
                    onChange={(e) => updateBlock(block.key, { campaignName: e.target.value })}
                    placeholder="Campagnenaam"
                    list="commission-campaign-names"
                    className={FIELD_CLASS}
                  />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Datum</label>
                  <input
                    type="date"
                    value={block.date}
                    onChange={(e) => updateBlock(block.key, { date: e.target.value })}
                    className={FIELD_CLASS}
                  />
                </div>
              </div>

              {selectedCat && (
                <p className="mt-2 text-xs text-gray-500">
                  Commissie voor deze lead: <span className="font-semibold text-gray-700">{formatEuroCents(selectedCat.priceCents)}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>

      <datalist id="commission-campaign-names">
        {campaignNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
        <div className="text-sm">
          {feedback && (
            <span className={feedback.tone === 'success' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>
              {feedback.text}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || filledCount === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? 'Opslaan…' : `Opslaan${filledCount > 0 ? ` (${filledCount})` : ''}`}
        </button>
      </div>
    </div>
  )
}
