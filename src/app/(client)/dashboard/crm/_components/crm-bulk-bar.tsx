'use client'

import { CRM_STAGES } from '../_lib/constants'
import type { CrmEntry, CrmLabel, CrmStageId } from '../_lib/types'
import { displayCompany, displayName, initialsOf } from '../_lib/view'

const bulkSelectClass =
  'h-7 rounded-[7px] border border-white/[0.18] bg-white/[0.08] px-2.5 text-xs font-medium text-white outline-none disabled:opacity-50'

/** Donkere balk zodra er iets geselecteerd is — board én tabel. */
export function CrmBulkBar({
  selection,
  labels,
  onStage,
  onLabel,
  onDelete,
  onClear,
}: {
  selection: Set<string>
  labels: CrmLabel[]
  onStage: (stage: CrmStageId) => void
  onLabel: (labelId: string) => void
  onDelete: () => void
  onClear: () => void
}) {
  if (selection.size === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[11px] bg-ink px-3.5 py-2.5 text-white">
      <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-white/[0.14] text-[11px] font-bold tabular-nums">
        {selection.size}
      </span>
      <span className="shrink-0 text-[12.5px] font-medium">geselecteerd</span>
      <div className="h-[18px] w-px shrink-0 bg-white/[0.16]" />

      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onStage(e.target.value as CrmStageId)
          e.target.value = ''
        }}
        aria-label="Fase toepassen op selectie"
        className={bulkSelectClass}
      >
        <option value="" className="text-fg">
          Fase wijzigen…
        </option>
        {CRM_STAGES.map((s) => (
          <option key={s.id} value={s.id} className="text-fg">
            {s.name}
          </option>
        ))}
      </select>

      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onLabel(e.target.value)
          e.target.value = ''
        }}
        disabled={labels.length === 0}
        aria-label="Label toevoegen aan selectie"
        className={bulkSelectClass}
      >
        <option value="" className="text-fg">
          Label toevoegen…
        </option>
        {labels.map((l) => (
          <option key={l.id} value={l.id} className="text-fg">
            {l.name}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onDelete}
        className="flex h-7 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[7px] border border-[color-mix(in_oklab,var(--color-neg)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_22%,transparent)] px-[11px] text-xs font-semibold text-white transition-colors hover:bg-[color-mix(in_oklab,var(--color-neg)_34%,transparent)]"
      >
        <TrashIcon className="h-[13px] w-[13px]" />
        Verwijderen uit CRM
      </button>

      <button
        type="button"
        onClick={onClear}
        className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium text-white/60 transition-colors hover:text-white"
      >
        Selectie wissen
      </button>
    </div>
  )
}

/**
 * Bevestiging. Benoemt expliciet wat er wél en niet verdwijnt: alleen de
 * CRM-laag; de lead blijft in de Lead inbox en bij Campagne leads staan.
 */
export function DeleteFromCrmDialog({
  entries,
  pending,
  onCancel,
  onConfirm,
}: {
  entries: CrmEntry[]
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const count = entries.length

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Verwijderen uit het CRM bevestigen"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[color-mix(in_oklab,var(--color-ink)_55%,transparent)] p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] overflow-hidden rounded-[14px] border border-line bg-panel shadow-2xl"
      >
        <div className="px-6 pb-[18px] pt-[22px]">
          <div className="flex items-start gap-[13px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_oklab,var(--color-neg)_10%,transparent)] text-neg">
              <TrashIcon className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold tracking-[-0.02em] text-fg">
                {count === 1
                  ? `${displayName(entries[0])} verwijderen uit het CRM?`
                  : `${count} leads verwijderen uit het CRM?`}
              </h2>
              <p className="mt-[9px] text-[12.5px] leading-[1.6] text-muted">
                Je fases, labels, notities en geplande acties{' '}
                {count === 1 ? 'voor deze lead' : 'voor deze leads'} verdwijnen. De{' '}
                {count === 1 ? 'lead zelf blijft' : 'leads zelf blijven'} staan in de Lead
                inbox en bij Campagne leads.
              </p>
            </div>
          </div>

          <div className="mt-3.5 max-h-52 overflow-y-auto rounded-[9px] border border-line">
            {entries.map((entry, i) => (
              <div
                key={entry.key}
                className={`flex items-center gap-2.5 px-3 py-[9px] ${
                  i < entries.length - 1 ? 'border-b border-line' : ''
                }`}
              >
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-track text-[9.5px] font-semibold text-muted">
                  {initialsOf(entry)}
                </span>
                <span className="shrink-0 text-xs font-medium text-fg">
                  {displayName(entry)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[11.5px] text-faint">
                  {displayCompany(entry) ?? entry.email}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-[9px] border-t border-line bg-track px-6 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-[34px] rounded-control border border-line bg-panel px-3.5 text-[12.5px] font-medium text-fg transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="h-[34px] rounded-control bg-neg px-[15px] text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? 'Bezig…' : 'Verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}
