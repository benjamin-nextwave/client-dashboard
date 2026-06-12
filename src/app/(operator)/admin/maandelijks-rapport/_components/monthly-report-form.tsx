'use client'

import { useState, useTransition } from 'react'
import { submitMonthlyReport } from '@/lib/actions/monthly-report-actions'

interface ClientOption {
  id: string
  name: string
}

interface MonthlyReportFormProps {
  clients: ClientOption[]
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100'

const labelClass = 'block text-sm font-semibold text-gray-900'

export function MonthlyReportForm({ clients }: MonthlyReportFormProps) {
  const [clientId, setClientId] = useState('')
  const [replyRate, setReplyRate] = useState('')
  const [opinion, setOpinion] = useState('')
  const [objections, setObjections] = useState<string[]>([''])
  const [improvements, setImprovements] = useState<string[]>([''])
  const [additions, setAdditions] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const selectedClient = clients.find((c) => c.id === clientId)

  // Generieke helpers voor de dynamische lijsten (bezwaren / verbeteringen).
  function updateItem(
    list: string[],
    setList: (v: string[]) => void,
    index: number,
    value: string
  ) {
    setList(list.map((item, i) => (i === index ? value : item)))
  }

  function addItem(list: string[], setList: (v: string[]) => void) {
    setList([...list, ''])
  }

  function removeItem(
    list: string[],
    setList: (v: string[]) => void,
    index: number
  ) {
    const next = list.filter((_, i) => i !== index)
    setList(next.length > 0 ? next : [''])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!clientId) {
      setError('Kies eerst een klant.')
      return
    }
    const rate = Number(replyRate)
    if (replyRate.trim() === '' || Number.isNaN(rate)) {
      setError('Vul een geldige reply rate in.')
      return
    }

    startTransition(async () => {
      const result = await submitMonthlyReport({
        clientId,
        replyRate: rate,
        campaignOpinion: opinion,
        commonObjections: objections,
        improvements,
        additions: additions.trim() === '' ? null : additions,
        startDate,
        endDate,
      })

      if ('error' in result) {
        setError(result.error)
        return
      }

      setSuccess(
        `Rapport verzonden voor ${selectedClient?.name ?? 'de klant'} — ${result.leadCount} lead(s) meegestuurd.`
      )
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {/* Klant kiezen */}
      <div className="space-y-2">
        <label htmlFor="client" className={labelClass}>
          Klant
        </label>
        <select
          id="client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={inputClass}
        >
          <option value="">— Kies een klant —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* De rest van de vragenlijst verschijnt pas na klantkeuze */}
      {clientId && (
        <>
          {/* Reply rate */}
          <div className="space-y-2">
            <label htmlFor="replyRate" className={labelClass}>
              Wat is de reply rate?
            </label>
            <div className="relative max-w-[200px]">
              <input
                id="replyRate"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="100"
                value={replyRate}
                onChange={(e) => setReplyRate(e.target.value)}
                placeholder="0"
                className={`${inputClass} pr-8`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                %
              </span>
            </div>
          </div>

          {/* Mening over campagne */}
          <div className="space-y-2">
            <label htmlFor="opinion" className={labelClass}>
              Wat is jouw mening over de campagne — volbracht het zijn potentie?
            </label>
            <textarea
              id="opinion"
              value={opinion}
              onChange={(e) => setOpinion(e.target.value)}
              rows={4}
              placeholder="Beschrijf hoe de campagne presteerde..."
              className={inputClass}
            />
          </div>

          {/* Meest voorkomende bezwaren */}
          <div className="space-y-2">
            <label className={labelClass}>Meest voorkomende bezwaren</label>
            <p className="text-xs text-gray-500">
              1 tot 2 regels per bezwaar.
            </p>
            <div className="space-y-2">
              {objections.map((value, i) => (
                <div key={i} className="flex items-start gap-2">
                  <textarea
                    value={value}
                    onChange={(e) =>
                      updateItem(objections, setObjections, i, e.target.value)
                    }
                    rows={2}
                    placeholder={`Bezwaar ${i + 1}`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(objections, setObjections, i)}
                    aria-label="Bezwaar verwijderen"
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addItem(objections, setObjections)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Bezwaar toevoegen
            </button>
          </div>

          {/* Aanpassingen op basis van weerleggingen */}
          <div className="space-y-2">
            <label className={labelClass}>
              Aanpassingen die de campagne beter kunnen maken (op basis van de
              weerleggingen)
            </label>
            <p className="text-xs text-gray-500">
              1 tot 2 regels per verbetering.
            </p>
            <div className="space-y-2">
              {improvements.map((value, i) => (
                <div key={i} className="flex items-start gap-2">
                  <textarea
                    value={value}
                    onChange={(e) =>
                      updateItem(improvements, setImprovements, i, e.target.value)
                    }
                    rows={2}
                    placeholder={`Verbetering ${i + 1}`}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(improvements, setImprovements, i)}
                    aria-label="Verbetering verwijderen"
                    className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addItem(improvements, setImprovements)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Verbetering toevoegen
            </button>
          </div>

          {/* Eventuele toevoegingen (optioneel) */}
          <div className="space-y-2">
            <label htmlFor="additions" className={labelClass}>
              Eventuele toevoegingen aan de campagne{' '}
              <span className="font-normal text-gray-400">(optioneel)</span>
            </label>
            <p className="text-xs text-gray-500">
              Een extra aanbod, doelgroep, etc.
            </p>
            <textarea
              id="additions"
              value={additions}
              onChange={(e) => setAdditions(e.target.value)}
              rows={3}
              placeholder="Optionele aanvullingen..."
              className={inputClass}
            />
          </div>

          {/* Campagneperiode */}
          <div className="space-y-2">
            <label className={labelClass}>Campagneperiode</label>
            <p className="text-xs text-gray-500">
              Bepaalt welke leads worden meegestuurd naar Make.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-1">
                <label htmlFor="startDate" className="block text-xs font-medium text-gray-500">
                  Startdatum
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="endDate" className="block text-xs font-medium text-gray-500">
                  Einddatum
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>{success}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? 'Bezig met verzenden...' : 'Rapport verzenden'}
            </button>
          </div>
        </>
      )}
    </form>
  )
}
