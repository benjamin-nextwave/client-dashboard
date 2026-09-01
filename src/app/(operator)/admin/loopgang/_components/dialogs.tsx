'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuroCents } from '@/lib/commissions-shared'
import type {
  LoopgangClientOption,
  LoopgangOverviewClient,
  OverviewInvoice,
} from '@/lib/data/loopgang-overview'
import type { MeetingOutcome } from '@/lib/loopgang/cycle'
import {
  deleteInvoiceAction,
  deleteLeadReportAction,
  handleMeetingAction,
  resetMeetingAction,
  savePauseNoteAction,
  setAdminPauseAction,
  saveInvoiceAction,
  saveLeadReportAction,
  setDailySendTargetAction,
  setInvoicePaidAction,
  setLoopgangVisibilityAction,
} from '../actions'

// -----------------------------------------------------------------------------
// Modale schil
// -----------------------------------------------------------------------------

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-900">
      {text}
    </p>
  )
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100'

const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500'

const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50'

const ghostButton =
  'inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50'

// -----------------------------------------------------------------------------
// Factuur
// -----------------------------------------------------------------------------

interface DialogProps {
  client: LoopgangOverviewClient
  today: string
  onClose: () => void
}

export function InvoiceDialog({ client, today, onClose }: DialogProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveInvoiceAction(client.id, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  function togglePaid(invoice: OverviewInvoice) {
    setError(null)
    startTransition(async () => {
      const result = await setInvoicePaidAction(
        invoice.id,
        client.id,
        invoice.paidAt ? null : today
      )
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  function remove(invoiceId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteInvoiceAction(invoiceId, client.id)
      if (result.error) setError(result.error)
      else {
        setConfirmDelete(null)
        router.refresh()
      }
    })
  }

  return (
    <Modal
      title="Factuur toevoegen"
      subtitle={`${client.companyName} — de factuurdatum wordt het nieuwe startpunt van de cyclus`}
      onClose={onClose}
    >
      <form action={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="invoiceDate">
              Factuurdatum
            </label>
            <input
              id="invoiceDate"
              name="invoiceDate"
              type="date"
              defaultValue={today}
              required
              className={`mt-1 ${fieldClass}`}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="amount">
              Bedrag excl. btw
            </label>
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              placeholder="2150,00"
              required
              className={`mt-1 ${fieldClass}`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="paidAt">
            Betaald op <span className="font-normal normal-case text-gray-400">(leeg = nog open)</span>
          </label>
          <input id="paidAt" name="paidAt" type="date" className={`mt-1 ${fieldClass}`} />
        </div>

        <div>
          <label className={labelClass} htmlFor="invoicePdf">
            PDF van de factuur
          </label>
          <input
            id="invoicePdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            className="mt-1 w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gray-700"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="invoiceNote">
            Toelichting
          </label>
          <textarea id="invoiceNote" name="note" rows={2} className={`mt-1 ${fieldClass}`} />
        </div>

        <ErrorLine text={error} />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghostButton}>
            Annuleren
          </button>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? 'Opslaan…' : 'Factuur opslaan'}
          </button>
        </div>
      </form>

      {client.invoices.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Eerdere facturen
          </div>
          <ul className="mt-2 space-y-1.5">
            {client.invoices.slice(0, 6).map((invoice) => (
              <li
                key={invoice.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900 tabular-nums">
                    {formatDayShort(invoice.invoiceDate)}
                  </span>
                  <span className="ml-2 tabular-nums text-gray-600">
                    {invoice.amountCents === null ? '—' : formatEuroCents(invoice.amountCents)}
                  </span>
                  <span
                    className={`ml-2 ${invoice.paidAt ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {invoice.paidAt ? `betaald ${formatDayShort(invoice.paidAt)}` : 'open'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {invoice.pdfUrl && (
                    <a
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-indigo-600 hover:underline"
                    >
                      PDF
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => togglePaid(invoice)}
                    disabled={pending}
                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 disabled:opacity-50"
                  >
                    {invoice.paidAt ? 'open zetten' : 'betaald'}
                  </button>
                  {confirmDelete === invoice.id ? (
                    <button
                      type="button"
                      onClick={() => remove(invoice.id)}
                      disabled={pending}
                      className="text-[11px] font-semibold text-rose-600 hover:underline disabled:opacity-50"
                    >
                      zeker weten?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(invoice.id)}
                      className="text-[11px] font-semibold text-gray-400 hover:text-rose-600"
                    >
                      wissen
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}

// -----------------------------------------------------------------------------
// Leadrapportage
// -----------------------------------------------------------------------------

export function LeadReportDialog({ client, today, onClose }: DialogProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await saveLeadReportAction(client.id, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  const last = client.lastLeadReport

  return (
    <Modal
      title="Leadrapportage toevoegen"
      subtitle={`${client.companyName} — alleen zichtbaar in het admin dashboard, de klant ziet dit niet`}
      onClose={onClose}
    >
      <form action={submit} className="space-y-3">
        <div>
          <label className={labelClass} htmlFor="reportDate">
            Datum
          </label>
          <input
            id="reportDate"
            name="reportDate"
            type="date"
            defaultValue={today}
            required
            className={`mt-1 ${fieldClass}`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reportPdf">
            PDF van de rapportage
          </label>
          <input
            id="reportPdf"
            name="pdf"
            type="file"
            accept="application/pdf"
            className="mt-1 w-full text-xs text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-gray-700"
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="reportNote">
            Toelichting
          </label>
          <textarea id="reportNote" name="note" rows={2} className={`mt-1 ${fieldClass}`} />
        </div>

        <ErrorLine text={error} />

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ghostButton}>
            Annuleren
          </button>
          <button type="submit" disabled={pending} className={primaryButton}>
            {pending ? 'Opslaan…' : 'Rapportage opslaan'}
          </button>
        </div>
      </form>

      {last && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4 text-xs">
          <span className="text-gray-600">
            Laatste rapportage:{' '}
            <span className="font-semibold tabular-nums text-gray-900">
              {formatDayShort(last.reportDate)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            {last.pdfUrl && (
              <a
                href={last.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                PDF
              </a>
            )}
            {confirmDelete ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteLeadReportAction(last.id, client.id)
                    if (result.error) setError(result.error)
                    else {
                      setConfirmDelete(false)
                      router.refresh()
                    }
                  })
                }
                className="text-[11px] font-semibold text-rose-600 hover:underline disabled:opacity-50"
              >
                zeker weten?
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[11px] font-semibold text-gray-400 hover:text-rose-600"
              >
                wissen
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

// -----------------------------------------------------------------------------
// Evaluatiemeeting
// -----------------------------------------------------------------------------

export function MeetingDialog({ client, today, onClose }: DialogProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [choice, setChoice] = useState<MeetingOutcome | null>(
    client.meeting?.outcome ?? null
  )
  const [meetingDate, setMeetingDate] = useState(client.meeting?.meetingDate ?? '')
  const [note, setNote] = useState(client.meeting?.note ?? '')

  const anchor = client.cycle.anchor

  function save() {
    if (!anchor || !choice) return
    setError(null)
    startTransition(async () => {
      const result = await handleMeetingAction(
        client.id,
        anchor,
        choice,
        choice === 'planned' ? meetingDate || null : null,
        note
      )
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  function reset() {
    if (!anchor) return
    setError(null)
    startTransition(async () => {
      const result = await resetMeetingAction(client.id, anchor)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  const options: Array<{ value: MeetingOutcome; label: string; hint: string }> = [
    { value: 'planned', label: 'Meeting is gepland', hint: 'Kies hieronder de datum' },
    { value: 'stop', label: 'Geen meeting, klant stoppen', hint: 'Alleen registratie' },
    { value: 'continue', label: 'Geen meeting, klant doorpakken', hint: 'Cyclus loopt door' },
  ]

  return (
    <Modal
      title="Meeting is afgehandeld"
      subtitle={`${client.companyName} — maandelijkse evaluatiemeeting`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setChoice(option.value)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                choice === option.value
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs font-semibold">{option.label}</span>
              <span
                className={`text-[11px] ${choice === option.value ? 'text-gray-300' : 'text-gray-400'}`}
              >
                {option.hint}
              </span>
            </button>
          ))}
        </div>

        {choice === 'planned' && (
          <div>
            <label className={labelClass} htmlFor="meetingDate">
              Datum van de meeting
            </label>
            <input
              id="meetingDate"
              type="date"
              value={meetingDate}
              min={today}
              onChange={(e) => setMeetingDate(e.target.value)}
              className={`mt-1 ${fieldClass}`}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Twee dagen ervoor verschijnt de herinnering om de campagne-analyse te maken.
            </p>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="meetingNote">
            Toelichting
          </label>
          <textarea
            id="meetingNote"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`mt-1 ${fieldClass}`}
          />
        </div>

        <ErrorLine text={error} />

        <div className="flex items-center justify-between gap-2 pt-1">
          {client.meeting ? (
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="text-[11px] font-semibold text-gray-400 hover:text-rose-600 disabled:opacity-50"
            >
              Afhandeling ongedaan maken
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={ghostButton}>
              Annuleren
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !choice || (choice === 'planned' && !meetingDate)}
              className={primaryButton}
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// -----------------------------------------------------------------------------
// Pauzereden
// -----------------------------------------------------------------------------

/**
 * Pauze starten, beëindigen, of de reden van de laatste pauze bijstellen.
 *
 * Deze pauze raakt Instantly niet — hij bevriest de loopgang. Zolang hij loopt
 * telt de cyclus niet door en komen er geen herinneringen. Wil je de campagnes
 * zelf stilzetten, dan is dat de knop op de loopgangpagina van de klant.
 */
export function PauseDialog({ client, today, onClose }: DialogProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState(client.isPaused ? (client.lastPause?.note ?? '') : '')

  const pause = client.lastPause
  const pausedDays = client.pausedSince ? countDaysBetween(client.pausedSince, today) : 0

  function toggle(paused: boolean) {
    setError(null)
    startTransition(async () => {
      const result = await setAdminPauseAction(client.id, paused, note)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
      onClose()
    })
  }

  function saveNote() {
    if (!pause) return
    setError(null)
    startTransition(async () => {
      const result = await savePauseNoteAction(pause.id, client.id, note)
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
      title={client.isPaused ? 'Pauze loopt' : 'Pauze starten'}
      subtitle={`${client.companyName} — bevriest de loopgang, raakt Instantly niet`}
      onClose={onClose}
    >
      <div className="space-y-3">
        {client.isPaused ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900">
            <span className="font-semibold">
              Staat stil sinds {client.pausedSince ? formatDayShort(client.pausedSince) : 'onbekend'}
            </span>
            {pausedDays > 0 && ` · ${pausedDays} ${pausedDays === 1 ? 'dag' : 'dagen'}`}. De
            werkdagteller loopt zolang niet door en er komen geen herinneringen.
          </p>
        ) : (
          <p className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-[11px] text-gray-600">
            Zolang de pauze loopt telt de cyclus niet door. Dagen in de pauze tellen niet mee voor
            werkdag 10 en werkdag 20, dus alle herinneringen schuiven mee op.
            {pause && (
              <>
                {' '}
                Laatste actie: {pause.action === 'pause' ? 'gepauzeerd' : 'hervat'} op{' '}
                {formatDayShort(pause.occurredAt.slice(0, 10))}.
              </>
            )}
          </p>
        )}

        <div>
          <label className={labelClass} htmlFor="pauseNote">
            Reden
          </label>
          <textarea
            id="pauseNote"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Waarom staat deze klant stil?"
            className={`mt-1 ${fieldClass}`}
          />
        </div>

        <ErrorLine text={error} />

        <div className="flex items-center justify-between gap-2">
          {client.isPaused && pause ? (
            <button
              type="button"
              onClick={saveNote}
              disabled={pending}
              className="text-[11px] font-semibold text-gray-400 hover:text-gray-900 disabled:opacity-50"
            >
              Alleen de reden opslaan
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={ghostButton}>
              Annuleren
            </button>
            {client.isPaused ? (
              <button
                type="button"
                onClick={() => toggle(false)}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? 'Bezig…' : 'Beëindig pauze'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => toggle(true)}
                disabled={pending}
                className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
              >
                {pending ? 'Bezig…' : 'Pauze start'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function countDaysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.max(0, Math.round((to - from) / 86_400_000))
}

// -----------------------------------------------------------------------------
// Verzendnorm
// -----------------------------------------------------------------------------

export function TargetDialog({ client, onClose }: Omit<DialogProps, 'today'>) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [value, setValue] = useState(String(client.dailySendTarget))

  function save() {
    setError(null)
    const parsed = Number(value)
    if (!Number.isInteger(parsed)) {
      setError('Vul een heel getal in.')
      return
    }
    startTransition(async () => {
      const result = await setDailySendTargetAction(client.id, parsed)
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
      title="Gewenst verzendvolume"
      subtitle={`${client.companyName} — mails per werkdag`}
      onClose={onClose}
    >
      <div className="space-y-3">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={fieldClass}
        />
        <p className="text-[11px] text-gray-500">
          De norm is 900 per werkdag. Verander dit alleen als deze klant er bewust van afwijkt.
        </p>
        <ErrorLine text={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostButton}>
            Annuleren
          </button>
          <button type="button" onClick={save} disabled={pending} className={primaryButton}>
            {pending ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// -----------------------------------------------------------------------------
// Welke klanten in de kalender staan
// -----------------------------------------------------------------------------

export function ClientListDialog({
  options,
  onClose,
}: {
  options: LoopgangClientOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(options.map((o) => [o.id, o.visible]))
  )

  const selectedCount = options.filter((o) => checked[o.id]).length

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await setLoopgangVisibilityAction(
        options.map((o) => ({ clientId: o.id, visible: checked[o.id] ?? true }))
      )
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
      title="Klantenlijst beheren"
      subtitle="Welke klanten in de loopgangkalender staan. Raakt alleen dit overzicht."
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold tabular-nums text-gray-500">
            {selectedCount} van {options.length} aangevinkt
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setChecked(Object.fromEntries(options.map((o) => [o.id, true])))
              }
              className="font-semibold text-gray-500 hover:text-gray-900"
            >
              alles aan
            </button>
            <button
              type="button"
              onClick={() =>
                setChecked(Object.fromEntries(options.map((o) => [o.id, false])))
              }
              className="font-semibold text-gray-400 hover:text-gray-900"
            >
              alles uit
            </button>
          </div>
        </div>

        <ul className="max-h-72 space-y-0.5 overflow-y-auto rounded-xl border border-gray-100 p-1">
          {options.map((option) => (
            <li key={option.id}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={checked[option.id] ?? true}
                  onChange={(e) =>
                    setChecked((prev) => ({ ...prev, [option.id]: e.target.checked }))
                  }
                  className="h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                {option.companyName}
              </label>
            </li>
          ))}
        </ul>

        <ErrorLine text={error} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostButton}>
            Annuleren
          </button>
          <button type="button" onClick={save} disabled={pending} className={primaryButton}>
            {pending ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </Modal>
  )
}


// -----------------------------------------------------------------------------

const MONTHS_SHORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
]

export function formatDayShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_SHORT[m - 1]}`
}
