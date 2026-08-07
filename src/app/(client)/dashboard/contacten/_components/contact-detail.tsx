'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { CompanyLogo, domainOf } from './company-logo'
import type { ColumnDef, ContactRow } from './contacts-table'

interface Props {
  contact: ContactRow
  columns: ColumnDef[]
  nameColumnId: string
  emailColumnId: string
  companyColumnId?: string
  dncPending: boolean
  onAddToDnc: (email: string) => void
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}

/** Groepeert de dynamische kolommen in leesbare blokken. */
const GROUPS = [
  { key: 'contact', match: /naam|mail|telefoon|mobiel|functie|titel|name|phone|mobile|title|role/i },
  { key: 'company', match: /bedrijf|company|branche|sector|plaats|stad|adres|website|medewerker|omzet|kvk|city|address|industry|revenue/i },
] as const

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard geweigerd — stil falen is hier prima */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-start gap-2.5 border-b border-line px-[18px] py-2 text-left transition-colors hover:bg-[var(--brand-05)]"
    >
      <span className="w-24 shrink-0 pt-px text-[11.5px] text-faint">{label}</span>
      {/* Waarden breken af in plaats van te worden afgekapt — op deze pagina
          gaat het juist om het opzoeken van die gegevens. */}
      <span className="min-w-0 flex-1 text-[12.5px] leading-[1.45] [overflow-wrap:anywhere]">
        {value}
      </span>
      <span className="shrink-0 pt-0.5">
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-pos)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px]" aria-hidden>
            <path d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px] text-faint opacity-55" aria-hidden>
            <path d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
        )}
      </span>
    </button>
  )
}

export function ContactDetail({
  contact,
  columns,
  nameColumnId,
  emailColumnId,
  companyColumnId,
  dncPending,
  onAddToDnc,
  onPrev,
  onNext,
  onClose,
}: Props) {
  const t = useT()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'j') onNext()
      if (e.key === 'k') onPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onNext, onPrev])

  const name = contact.data[nameColumnId] || '—'
  const email = contact.data[emailColumnId] || ''
  const company = companyColumnId ? contact.data[companyColumnId] : ''
  const domain = domainOf(email)

  const filled = columns.filter((c) => (contact.data[c.id] ?? '').trim() !== '')
  const empty = columns.filter((c) => (contact.data[c.id] ?? '').trim() === '')

  const groupTitle: Record<string, string> = {
    contact: t('contacts.groupContact'),
    company: t('contacts.groupCompany'),
  }

  const grouped = GROUPS.map((g) => ({
    title: groupTitle[g.key],
    fields: filled.filter((c) => g.match.test(c.name)),
  })).filter((g) => g.fields.length > 0)

  const rest = filled.filter((c) => !GROUPS.some((g) => g.match.test(c.name)))
  if (rest.length) grouped.push({ title: t('contacts.groupOther'), fields: rest })

  return (
    <aside className="hidden w-[356px] shrink-0 flex-col overflow-hidden rounded-panel border border-line bg-panel lg:flex">
      <div className="shrink-0 border-b border-line px-[18px] py-4">
        <div className="flex items-start gap-3">
          <CompanyLogo domain={domain} label={company || name} size={38} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.02em]">{name}</h2>
            <div className="mt-[3px] truncate text-[11.5px] text-faint">
              {company}
              {company && domain ? ' · ' : ''}
              {domain}
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard.writeText(
                filled.map((c) => `${c.name}: ${contact.data[c.id]}`).join('\n')
              )
            }
            title={t('contacts.copyAll')}
            aria-label={t('contacts.copyAll')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] border border-line bg-panel text-muted transition-colors hover:bg-[var(--brand-08)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-faint transition-colors hover:bg-[var(--brand-08)] hover:text-fg"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {grouped.map((group) => (
          <div key={group.title}>
            <div className="px-[18px] pb-[7px] pt-[13px] text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {group.title}
            </div>
            {group.fields.map((col) => (
              <CopyRow key={col.id} label={col.name} value={contact.data[col.id]} />
            ))}
          </div>
        ))}

        {/* Lege velden blijven zichtbaar: zo zie je wat het bestand níét bevat */}
        {empty.length > 0 && (
          <div className="px-[18px] pb-[18px] pt-[13px]">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              {t('contacts.emptyFields')}
            </div>
            <div className="flex flex-wrap gap-[5px]">
              {empty.map((col) => (
                <span
                  key={col.id}
                  className="whitespace-nowrap rounded-[5px] border border-dashed border-line px-[7px] py-0.5 text-[10.5px] text-faint"
                >
                  {col.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-[9px] border-t border-line px-[18px] py-3">
        <button
          type="button"
          onClick={() => onAddToDnc(email.trim().toLowerCase())}
          disabled={dncPending || !email}
          className="flex h-[34px] flex-1 items-center justify-center gap-[7px] whitespace-nowrap rounded-control border border-line bg-panel text-[12.5px] font-medium transition-colors hover:bg-[var(--brand-08)] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-muted" aria-hidden>
            <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          {t('contacts.addToDnc')}
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onPrev}
            title={t('contacts.detailPrevious')}
            aria-label={t('contacts.detailPrevious')}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            title={t('contacts.detailNext')}
            aria-label={t('contacts.detailNext')}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
