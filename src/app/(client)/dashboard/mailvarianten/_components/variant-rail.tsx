'use client'

import { useT } from '@/lib/i18n/client'
import {
  MAIL_TITLE_KEY,
  STATUS_COLOR,
  STATUS_LABEL_KEY,
  type MailGroup,
} from '../_lib/variant-groups'

interface Props {
  groups: MailGroup[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Tijdstip van het laatste akkoord; basis voor het "nieuw sinds"-kaartje. */
  newSince: string | null
  newCount: number
}

export function VariantRail({ groups, selectedId, onSelect, newSince, newCount }: Props) {
  const t = useT()

  // Geen eigen kolomwrapper: variants-tab.tsx zet de kaarten in de linkerkolom,
  // samen met het PDF-kaartje.
  return (
    <>
      {newSince && newCount > 0 && (
        <div className="shrink-0 rounded-[11px] border border-[color-mix(in_oklab,var(--color-brand)_30%,var(--color-line))] bg-[var(--brand-06)] px-3.5 py-[13px]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-brand-ink">
              {t('mailVariantsPage.newSince', {
                date: new Date(newSince).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                }),
              })}
            </span>
          </div>
          <p className="mt-2 text-[11.5px] leading-[1.5] text-muted">
            {newCount === 1
              ? t('mailVariantsPage.newSinceOne')
              : t('mailVariantsPage.newSinceMany', { count: newCount })}
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div
          key={group.mailNumber}
          className="shrink-0 overflow-hidden rounded-[11px] border border-line bg-panel"
        >
          <div className="flex items-center gap-[9px] border-b border-line bg-track px-[13px] py-[11px]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-line bg-panel text-[10.5px] font-bold tabular-nums text-muted">
              {group.mailNumber}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold tracking-[-0.01em]">
              {MAIL_TITLE_KEY[group.mailNumber]
                ? t(MAIL_TITLE_KEY[group.mailNumber])
                : t('mailVariantsPage.mailTitleFallback', { number: group.mailNumber })}
            </span>
            <span className="shrink-0 text-[10.5px] tabular-nums text-faint">
              {group.approvedCount}/{group.variants.length}
            </span>
          </div>

          {group.variants.map((view, i) => {
            const active = view.variant.id === selectedId
            const color = STATUS_COLOR[view.status]
            return (
              <button
                key={view.variant.id}
                type="button"
                onClick={() => onSelect(view.variant.id)}
                aria-current={active ? 'true' : undefined}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-[13px] py-2.5 text-left transition-colors ${
                  i > 0 ? 'border-t border-line' : ''
                } ${
                  active
                    ? 'bg-[var(--brand-08)] shadow-[inset_2px_0_0_var(--color-brand)]'
                    : 'hover:bg-[var(--brand-05)]'
                }`}
              >
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                    {view.variant.variantLabel}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                    {view.variant.subject}
                  </span>
                </span>
                <span
                  className="shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.05em]"
                  style={{ color }}
                >
                  {t(STATUS_LABEL_KEY[view.status])}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}
