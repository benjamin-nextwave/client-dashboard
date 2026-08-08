'use client'

import { useMemo, useState } from 'react'
import type {
  MailVariant,
  MailVariantFeedbackSubmission,
  MailVariantsTimelineEntry,
} from '@/lib/data/campaign'
import { buildAllMailVariantsTimeline } from '@/lib/data/campaign'
import { useT } from '@/lib/i18n/client'
import type { TranslationKey } from '@/lib/i18n'
import { ACTION_LABEL_KEY, actionTagClass } from '../_lib/variant-groups'

type EventKind = 'created' | 'revised' | 'approved' | 'feedback'

const ICON: Record<EventKind, { color: string; d: string }> = {
  created: {
    color: 'var(--color-brand)',
    d: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z',
  },
  revised: {
    color: 'var(--color-brand)',
    d: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125',
  },
  approved: { color: 'var(--color-pos)', d: 'm4.5 12.75 6 6 9-13.5' },
  feedback: {
    color: 'var(--color-warn)',
    d: 'M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
  },
}

const FILTERS: { key: 'all' | EventKind; labelKey: TranslationKey; color: string }[] = [
  { key: 'all', labelKey: 'mailVariantsPage.filterAll', color: 'var(--color-faint)' },
  { key: 'revised', labelKey: 'mailVariantsPage.filterRevised', color: 'var(--color-brand)' },
  { key: 'approved', labelKey: 'mailVariantsPage.filterApproved', color: 'var(--color-pos)' },
  { key: 'feedback', labelKey: 'mailVariantsPage.filterFeedback', color: 'var(--color-warn)' },
]

const EVENT_LABEL_KEY: Record<EventKind, TranslationKey> = {
  created: 'mailVariantsPage.eventCreated',
  revised: 'mailVariantsPage.eventRevised',
  approved: 'mailVariantsPage.eventApproved',
  feedback: 'mailVariantsPage.eventFeedback',
}

/**
 * 'created' op een variant die daarna nog is bijgewerkt lezen we als een
 * herziening. De marge van een minuut vangt het verschil op tussen created_at
 * en updated_at bij het aanmaken zelf.
 */
function kindOf(entry: MailVariantsTimelineEntry): EventKind {
  if (entry.event.kind === 'approved') return 'approved'
  if (entry.event.kind === 'feedback') return 'feedback'
  const created = new Date(entry.variant.createdAt).getTime()
  const updated = new Date(entry.variant.updatedAt).getTime()
  return updated - created > 60_000 ? 'revised' : 'created'
}

export function VariantHistory({
  variants,
  allFeedbackByVariant,
}: {
  variants: MailVariant[]
  allFeedbackByVariant: Record<string, MailVariantFeedbackSubmission[]>
}) {
  const t = useT()
  const [filter, setFilter] = useState<'all' | EventKind>('all')

  const entries = useMemo(
    () => buildAllMailVariantsTimeline(variants, allFeedbackByVariant),
    [variants, allFeedbackByVariant]
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length }
    for (const e of entries) {
      const k = kindOf(e)
      c[k] = (c[k] ?? 0) + 1
      // 'Nieuw of herzien' bundelt beide operator-gebeurtenissen.
      if (k === 'created') c.revised = (c.revised ?? 0) + 1
    }
    return c
  }, [entries])

  const byDay = useMemo(() => {
    const visible = entries.filter((e) => {
      if (filter === 'all') return true
      const k = kindOf(e)
      return filter === 'revised' ? k === 'revised' || k === 'created' : k === filter
    })
    const map = new Map<string, MailVariantsTimelineEntry[]>()
    for (const e of visible) {
      const key = new Date(e.event.at).toDateString()
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()]
  }, [entries, filter])

  function dayLabel(iso: string): string {
    const d = new Date(iso)
    const today = new Date()
    const diff = Math.floor(
      (new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000
    )
    const date = d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
    if (diff === 0) return `${t('mailVariantsPage.today')} · ${date}`
    if (diff === 1) return `${t('mailVariantsPage.yesterday')} · ${date}`
    return date
  }

  const openCount = variants.filter((v) => !v.clientApprovedAt).length
  const roundCount = Object.values(allFeedbackByVariant).flat().length
  const summary = [
    {
      label: t('mailVariantsPage.summaryVariants'),
      value: t('mailVariantsPage.summaryTotal', { count: variants.length }),
    },
    { label: t('mailVariantsPage.summaryRounds'), value: String(roundCount) },
    {
      label: t('mailVariantsPage.summaryOpen'),
      value:
        openCount === 1
          ? t('mailVariantsPage.summaryOpenOne')
          : t('mailVariantsPage.summaryOpenMany', { count: openCount }),
    },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {byDay.map(([day, events]) => (
          <div key={day} className="mb-2">
            <div className="flex items-center gap-3 pb-2.5 pt-2">
              <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.13em] text-faint">
                {dayLabel(events[0].event.at)}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex flex-col gap-2">
              {events.map((entry, i) => {
                const kind = kindOf(entry)
                const icon = ICON[kind]
                const isClient = kind === 'approved' || kind === 'feedback'
                const submission = entry.event.kind === 'feedback' ? entry.event.submission : null

                return (
                  <div
                    key={`${entry.variant.id}-${entry.event.at}-${i}`}
                    className="overflow-hidden rounded-[11px] border border-line bg-panel"
                  >
                    <div className="flex items-center gap-[11px] px-[15px] py-3">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
                        style={{
                          color: icon.color,
                          background: `color-mix(in oklab, ${icon.color} 12%, transparent)`,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-[13px] w-[13px]"
                        >
                          <path d={icon.d} />
                        </svg>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                          {t(EVENT_LABEL_KEY[kind], {
                            variant: `${t('mailVariantsPage.mailTitleFallback', {
                              number: entry.variant.mailNumber,
                            })} · ${entry.variant.variantLabel}`,
                          })}
                        </div>
                        <div className="mt-[3px] truncate text-[11.5px] text-faint">
                          {submission?.generalFeedback ??
                            (submission
                              ? submission.items.length === 1
                                ? t('mailVariantsPage.commentsOne')
                                : t('mailVariantsPage.commentsMany', {
                                    count: submission.items.length,
                                  })
                              : entry.variant.subject)}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 whitespace-nowrap rounded-[5px] px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${
                          isClient ? 'bg-[var(--brand-12)] text-brand-ink' : 'bg-track text-muted'
                        }`}
                      >
                        {isClient
                          ? t('mailVariantsPage.actorYou')
                          : t('mailVariantsPage.actorNextwave')}
                      </span>
                      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-faint">
                        {new Date(entry.event.at).toLocaleTimeString('nl-NL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {submission && submission.items.length > 0 && (
                      <div className="flex flex-col gap-2 border-t border-line bg-track px-[15px] py-2.5">
                        {submission.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2.5">
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-[5px] px-[7px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${actionTagClass(
                                item.actionType
                              )}`}
                            >
                              {t(ACTION_LABEL_KEY[item.actionType])}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="border-l-2 border-[var(--brand-32)] pl-[9px] text-[11.5px] italic leading-[1.5] text-muted">
                                {item.selectionText}
                              </div>
                              {item.feedbackText && (
                                <div className="mt-[5px] whitespace-pre-wrap text-[11.5px] leading-[1.5]">
                                  {item.feedbackText}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {byDay.length === 0 && (
          <p className="py-10 text-center text-[12.5px] text-faint">
            {t('mailVariantsPage.historyEmptyFilter')}
          </p>
        )}
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-3.5 overflow-y-auto lg:w-[274px]">
        <div className="shrink-0 overflow-hidden rounded-panel border border-line bg-panel">
          <div className="border-b border-line px-[15px] py-[13px]">
            <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
              {t('mailVariantsPage.historyFilter')}
            </h3>
          </div>
          <div className="flex flex-col gap-0.5 px-2.5 py-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`flex w-full cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-2 text-[12.5px] transition-colors ${
                  filter === f.key
                    ? 'bg-[var(--brand-10)] font-semibold'
                    : 'font-normal hover:bg-[var(--brand-05)]'
                }`}
              >
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: f.color }}
                />
                <span className="flex-1 text-left">{t(f.labelKey)}</span>
                <span className="text-[11px] tabular-nums text-faint">{counts[f.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="shrink-0 overflow-hidden rounded-panel border border-line bg-panel">
          <div className="border-b border-line px-[15px] py-[13px]">
            <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
              {t('mailVariantsPage.historySummary')}
            </h3>
          </div>
          <div className="px-[15px] pb-3 pt-1.5">
            {summary.map((r, i) => (
              <div
                key={r.label}
                className={`flex items-center gap-2.5 py-[9px] ${
                  i < summary.length - 1 ? 'border-b border-line' : ''
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-muted">{r.label}</span>
                <span className="shrink-0 text-[11.5px] font-semibold tabular-nums">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
