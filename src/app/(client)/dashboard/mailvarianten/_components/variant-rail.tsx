'use client'

import { useT } from '@/lib/i18n/client'
import {
  MAIL_TITLE_KEY,
  STATUS_CHIP_CLASS,
  STATUS_COLOR,
  STATUS_LABEL_KEY,
  summarizeProgress,
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
  const progress = summarizeProgress(groups)
  const donePct = progress.total === 0 ? 0 : (progress.approved / progress.total) * 100

  // Geen eigen kolomwrapper: variants-tab.tsx zet de kaarten in de linkerkolom,
  // samen met het PDF-kaartje.
  return (
    <>
      {progress.total > 0 && (
        <div className="shrink-0 rounded-[11px] border border-line bg-panel px-3.5 py-[13px]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">
              {t('mailVariantsPage.progressTitle')}
            </span>
            <span className="text-[11.5px] font-semibold tabular-nums">
              {t('mailVariantsPage.progressCounter', {
                done: progress.approved,
                total: progress.total,
              })}
            </span>
          </div>

          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-pos transition-[width] duration-300"
              style={{ width: `${donePct}%` }}
            />
          </div>

          <p className="mt-2.5 text-[11.5px] leading-[1.5] text-muted">
            {progress.open > 0
              ? progress.open === 1
                ? t('mailVariantsPage.progressOpenOne')
                : t('mailVariantsPage.progressOpenMany', { count: progress.open })
              : progress.feedbackPending > 0
                ? progress.feedbackPending === 1
                  ? t('mailVariantsPage.progressWaitingOne')
                  : t('mailVariantsPage.progressWaitingMany', {
                      count: progress.feedbackPending,
                    })
                : t('mailVariantsPage.progressAllDone')}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(
              [
                ['open', progress.open],
                ['feedback_pending', progress.feedbackPending],
                ['approved', progress.approved],
              ] as const
            )
              .filter(([, count]) => count > 0)
              .map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1 rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.05em] ${STATUS_CHIP_CLASS[status]}`}
                >
                  <span className="tabular-nums">{count}</span>
                  {t(STATUS_LABEL_KEY[status])}
                </span>
              ))}
          </div>
        </div>
      )}

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

      {groups.map((group) => {
        const groupOpen = group.variants.filter((v) => v.status === 'open').length
        const groupDone = group.approvedCount === group.variants.length
        return (
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
              {/* Groen vinkje zodra een hele mail rond is, anders het aantal dat
                  nog op de klant wacht. */}
              {groupDone ? (
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-pos)_15%,transparent)] text-pos"
                  aria-label={t('mailVariantsPage.statusApproved')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-2.5 w-2.5"
                  >
                    <path d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </span>
              ) : groupOpen > 0 ? (
                <span className="shrink-0 rounded-[5px] bg-[color-mix(in_oklab,var(--color-warn)_15%,transparent)] px-[6px] py-[2px] text-[10px] font-bold tabular-nums text-warn">
                  {groupOpen}
                </span>
              ) : null}
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
                    <span
                      className={`block truncate text-[12.5px] tracking-[-0.01em] ${
                        view.status === 'open' ? 'font-bold' : 'font-semibold'
                      }`}
                    >
                      {view.variant.variantLabel}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                      {view.variant.subject}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-[5px] px-[6px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.05em] ${STATUS_CHIP_CLASS[view.status]}`}
                  >
                    {t(STATUS_LABEL_KEY[view.status])}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
