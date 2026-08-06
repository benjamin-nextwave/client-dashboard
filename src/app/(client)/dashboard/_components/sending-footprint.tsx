'use client'

import { useEffect, useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import type { MailboxEntry } from '@/lib/data/campaign-stats'

interface SendingFootprintCardsProps {
  mailboxes: number
  domains: number
  entries: MailboxEntry[]
}

type Panel = 'mailboxes' | 'domains'

/**
 * Twee klikbare vlakken met het verzendbereik. Klikken opent een venster met
 * de onderliggende adressen en de campagnes waaraan ze gekoppeld zijn.
 *
 * De cijfers komen uit getSendingFootprint() en tellen wat er daadwerkelijk
 * gebruikt is — niet wat er in Instantly gekoppeld staat. Dat verschil staat
 * bewust in de ondertitel, zodat het cijfer niet meer belooft dan het is.
 */
export function SendingFootprintCards({
  mailboxes,
  domains,
  entries,
}: SendingFootprintCardsProps) {
  const t = useT()
  const [panel, setPanel] = useState<Panel | null>(null)

  const items = [
    {
      key: 'mailboxes' as const,
      label: t('overview.footprintMailboxes'),
      hint: t('overview.footprintMailboxesHint'),
      value: mailboxes,
      icon: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
    },
    {
      key: 'domains' as const,
      label: t('overview.footprintDomains'),
      hint: t('overview.footprintDomainsHint'),
      value: domains,
      icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.949 8.949 0 0 0 12 21Zm3-11.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setPanel(item.key)}
            className="group flex items-center gap-4 rounded-panel border border-line bg-panel px-[18px] py-4 text-left transition-colors hover:border-[var(--brand-32)] hover:bg-[var(--brand-08)]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-[var(--brand-10)] text-brand transition-colors group-hover:bg-[var(--brand-15)]">
              <svg className="h-[19px] w-[19px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-[26px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                {item.value.toLocaleString('nl-NL')}
              </div>
              <div className="mt-1.5 text-xs font-medium text-muted">{item.label}</div>
            </div>
            <div className="ml-auto flex items-center gap-2.5 pl-3">
              <p className="hidden max-w-[150px] text-right text-[11px] leading-tight text-faint lg:block">
                {item.hint}
              </p>
              <svg
                className="h-4 w-4 shrink-0 text-faint transition-colors group-hover:text-brand"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {panel && (
        <FootprintModal
          panel={panel}
          entries={entries}
          onClose={() => setPanel(null)}
          title={panel === 'mailboxes' ? t('overview.footprintMailboxes') : t('overview.footprintDomains')}
        />
      )}
    </>
  )
}

function FootprintModal({
  panel,
  entries,
  title,
  onClose,
}: {
  panel: Panel
  entries: MailboxEntry[]
  title: string
  onClose: () => void
}) {
  const t = useT()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const domainGroups = useMemo(() => {
    const map = new Map<string, MailboxEntry[]>()
    for (const entry of entries) {
      if (!entry.domain) continue
      const list = map.get(entry.domain) ?? []
      list.push(entry)
      map.set(entry.domain, list)
    }
    return Array.from(map.entries())
      .map(([domain, list]) => ({ domain, list }))
      .sort((a, b) => a.domain.localeCompare(b.domain, 'nl'))
  }, [entries])

  const isEmpty = panel === 'mailboxes' ? entries.length === 0 : domainGroups.length === 0

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-panel border border-line bg-panel"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-[15px]">
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-control p-1 text-faint transition-colors hover:bg-track hover:text-fg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {isEmpty ? (
            <p className="px-5 py-10 text-center text-[12.5px] text-muted">
              {t('overview.footprintEmpty')}
            </p>
          ) : panel === 'mailboxes' ? (
            <ul className="divide-y divide-line">
              {entries.map((entry) => (
                <li key={entry.address} className="px-5 py-3 transition-colors hover:bg-[var(--brand-08)]">
                  <div className="text-[12.5px] font-medium">{entry.address}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {entry.campaigns.length > 0 ? (
                      entry.campaigns.map((campaign) => (
                        <span
                          key={campaign}
                          className="rounded-full bg-[var(--brand-10)] px-2 py-0.5 text-[10.5px] font-medium text-brand"
                        >
                          {campaign}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-faint">
                        {t('overview.footprintNoCampaign')}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-line">
              {domainGroups.map(({ domain, list }) => (
                <li key={domain} className="px-5 py-3 transition-colors hover:bg-[var(--brand-08)]">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] font-medium">{domain}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-faint">
                      {t('overview.footprintDomainOf', { count: list.length })}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-muted">
                    {list.map((entry) => entry.address.split('@')[0]).join(' · ')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
