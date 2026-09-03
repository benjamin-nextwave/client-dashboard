'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { registreerKixAction, type KixKeuze } from '../actions'
import { Modal } from './dialogs'

/**
 * Wat Kix terugkoppelt, in één handeling vastgelegd.
 *
 * Kix belt en mailt over de evaluatiemeeting. Wat daaruit komt bepaalt of er
 * gefactureerd wordt en wanneer de campagne weer aan gaat — en juist die
 * vervolgstappen bleven liggen omdat je ze zelf moest onthouden. Daarom maakt
 * elke keuze hier meteen de taken aan die eruit voortkomen.
 */

interface Keuze {
  waarde: KixKeuze
  label: string
  gevolg: string
}

const KEUZES: Keuze[] = [
  {
    waarde: 'invoice-sent',
    label: 'Factuur verzonden',
    gevolg: 'Legt de factuur vast op vandaag. Het bedrag vul je later in.',
  },
  {
    waarde: 'report-sent',
    label: 'Leadrapportage verzonden',
    gevolg: 'Legt de rapportage vast op vandaag.',
  },
  {
    waarde: 'meeting-planned',
    label: 'Meeting gepland',
    gevolg: 'Zet de meeting op de gekozen datum. De belronde stopt.',
  },
  {
    waarde: 'meeting-continue',
    label: 'Meeting niet nodig — leadrapportage + factuur voor hervatten',
    gevolg: 'Taak voor Benjamin, morgen: leadrapportage en factuur versturen.',
  },
  {
    waarde: 'meeting-stop',
    label: 'Meeting niet nodig — klant stopt',
    gevolg:
      'Taak voor Benjamin morgen (leadrapportage) en voor Kix over 3 dagen (factuur, twee dagen later).',
  },
]

export function KixDialog({
  clients,
  today,
  preselected,
  onClose,
}: {
  clients: LoopgangOverviewClient[]
  today: string
  /** De klant die al gekozen was in het filter, als dat er precies één is. */
  preselected: string | null
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [clientId, setClientId] = useState(preselected ?? '')
  const [keuze, setKeuze] = useState<KixKeuze | ''>('')
  const [meetingDate, setMeetingDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  const klaar =
    clientId !== '' && keuze !== '' && (keuze !== 'meeting-planned' || meetingDate !== '')

  function opslaan() {
    if (keuze === '') return
    setError(null)
    startTransition(async () => {
      const result = await registreerKixAction({
        clientId,
        keuze,
        meetingDate: keuze === 'meeting-planned' ? meetingDate : null,
        vandaag: today,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <Modal
      title="Kix toevoegen"
      subtitle="Leg vast wat Kix heeft gedaan of afgesproken. De vervolgtaken worden meteen aangemaakt."
      onClose={onClose}
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="kix-klant"
            className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500"
          >
            Klant
          </label>
          <select
            id="kix-klant"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-400"
          >
            <option value="">Kies een klant…</option>
            {clients.map((c) => (
              <option key={c.key} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Wat is er gebeurd
          </legend>
          <div className="mt-2 space-y-1.5">
            {KEUZES.map((k) => {
              const gekozen = keuze === k.waarde
              return (
                <label
                  key={k.waarde}
                  className={`block cursor-pointer rounded-xl border p-3 transition-colors ${
                    gekozen ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="kix-keuze"
                      value={k.waarde}
                      checked={gekozen}
                      onChange={() => setKeuze(k.waarde)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-900">{k.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-gray-500">
                        {k.gevolg}
                      </span>
                    </span>
                  </span>

                  {k.waarde === 'meeting-planned' && gekozen && (
                    <input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-400"
                    />
                  )}
                </label>
              )
            })}
          </div>
        </fieldset>

        {error && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={opslaan}
            disabled={pending || !klaar}
            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? 'Opslaan…' : 'Vastleggen'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
