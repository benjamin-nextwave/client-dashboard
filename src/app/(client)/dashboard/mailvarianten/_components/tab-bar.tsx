import Link from 'next/link'

export type MailVariantsTab = 'varianten' | 'flow' | 'geschiedenis'

export const MAIL_VARIANTS_TABS: MailVariantsTab[] = ['varianten', 'flow', 'geschiedenis']

export function isMailVariantsTab(value: string | undefined): value is MailVariantsTab {
  return !!value && (MAIL_VARIANTS_TABS as string[]).includes(value)
}

interface Props {
  active: MailVariantsTab
  /** Label + optioneel telbolletje per tab, in de volgorde van MAIL_VARIANTS_TABS. */
  tabs: { key: MailVariantsTab; label: string; count?: number }[]
}

/**
 * De tabstaat staat in de URL (?tab=), zodat een link naar een tabblad
 * deelbaar blijft en de pagina een server component kan blijven.
 */
export function TabBar({ active, tabs }: Props) {
  return (
    <div className="inline-flex gap-0.5 rounded-[9px] border border-line bg-panel p-[3px]">
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={`/dashboard/mailvarianten?tab=${tab.key}`}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-[7px] whitespace-nowrap rounded-[7px] px-[13px] py-[6px] text-[12.5px] transition-colors ${
              isActive
                ? 'bg-[var(--brand-10)] font-semibold text-brand-ink'
                : 'font-medium text-muted hover:bg-[var(--brand-05)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                  isActive ? 'bg-brand text-white' : 'bg-track text-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
