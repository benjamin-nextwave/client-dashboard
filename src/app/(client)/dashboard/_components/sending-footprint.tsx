'use client'

import { useT } from '@/lib/i18n/client'

interface SendingFootprintCardsProps {
  mailboxes: number
  domains: number
}

/**
 * Twee vlakken met het verzendbereik: hoeveel mailboxen er voor deze klant
 * versturen en hoeveel domeinen daarachter zitten.
 *
 * De cijfers komen uit getSendingFootprint() en tellen wat er daadwerkelijk
 * gebruikt is — niet wat er in Instantly gekoppeld staat. Dat verschil staat
 * bewust in de ondertitel, zodat het cijfer niet meer belooft dan het is.
 */
export function SendingFootprintCards({ mailboxes, domains }: SendingFootprintCardsProps) {
  const t = useT()

  const items = [
    {
      label: t('overview.footprintMailboxes'),
      hint: t('overview.footprintMailboxesHint'),
      value: mailboxes,
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
        />
      ),
    },
    {
      label: t('overview.footprintDomains'),
      hint: t('overview.footprintDomainsHint'),
      value: domains,
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.949 8.949 0 0 0 4.951-1.488A3.987 3.987 0 0 0 13 16h-2a3.987 3.987 0 0 0-3.951 3.512A8.949 8.949 0 0 0 12 21Zm3-11.25a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex items-center gap-4 rounded-panel border border-line bg-panel px-[18px] py-4 transition-colors hover:border-[var(--brand-32)]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-[var(--brand-10)] text-brand transition-colors group-hover:bg-[var(--brand-15)]">
            <svg className="h-[19px] w-[19px]" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
              {item.icon}
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[26px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
              {item.value.toLocaleString('nl-NL')}
            </div>
            <div className="mt-1.5 text-xs font-medium text-muted">{item.label}</div>
          </div>
          <p className="ml-auto hidden max-w-[46%] text-right text-[11px] leading-tight text-faint sm:block">
            {item.hint}
          </p>
        </div>
      ))}
    </div>
  )
}
