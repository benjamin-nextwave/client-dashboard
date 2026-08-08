'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { addDncEntries } from '@/lib/actions/dnc-actions'
import { useT, useWebhookLocale } from '@/lib/i18n/client'
import { parseDncInput } from '../_lib/parse-dnc-input'

const DNC_WEBHOOK = 'https://hook.eu2.make.com/dhkkgga3ktiwgalbkeujdw21odiqqqa5'

type Tone = 'neutral' | 'brand' | 'muted' | 'warn'

const TONE: Record<Tone, string> = {
  neutral: 'bg-track text-muted',
  brand: 'bg-[var(--brand-10)] text-brand-ink',
  muted: 'border border-line text-faint',
  warn: 'bg-[color-mix(in_oklab,var(--color-warn)_12%,transparent)] text-warn',
}

const DOT: Record<Tone, string> = {
  neutral: 'bg-faint',
  brand: 'bg-brand',
  muted: '',
  warn: 'bg-warn',
}


/**
 * Eén invoerveld voor adressen én domeinen, met live parse- en dedupe-preview.
 * Vervangt de twee losse formulieren uit dnc-add-form.tsx.
 */
export function DncAddPanel({
  companyName,
  existingValues,
}: {
  companyName: string
  /** Alle bestaande waarden in kleine letters — voor de dedupe-preview. */
  existingValues: string[]
}) {
  const t = useT()
  const localeInfo = useWebhookLocale()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const existing = useMemo(() => new Set(existingValues), [existingValues])
  const parsed = useMemo(() => parseDncInput(text, existing), [text, existing])

  const chips: { label: string; tone: Tone }[] = []
  if (parsed.emails.length) {
    chips.push({
      label:
        parsed.emails.length === 1
          ? t('dnc.countEmailsSingular')
          : t('dnc.countEmails', { count: parsed.emails.length }),
      tone: 'neutral',
    })
  }
  if (parsed.domains.length) {
    chips.push({
      label:
        parsed.domains.length === 1
          ? t('dnc.countDomainsSingular')
          : t('dnc.countDomains', { count: parsed.domains.length }),
      tone: 'brand',
    })
  }
  if (parsed.duplicates.length) {
    chips.push({
      label:
        parsed.duplicates.length === 1
          ? t('dnc.countDuplicatesSingular')
          : t('dnc.countDuplicates', { count: parsed.duplicates.length }),
      tone: 'muted',
    })
  }
  if (parsed.invalid.length) {
    chips.push({ label: t('dnc.countInvalid', { count: parsed.invalid.length }), tone: 'warn' })
  }

  function submit() {
    if (parsed.addCount === 0) return
    setError('')
    startTransition(async () => {
      const res = await addDncEntries({ emails: parsed.emails, domains: parsed.domains })
      if ('error' in res) {
        setError(res.error)
        return
      }
      // Make.com blijft ongewijzigd: één call met alle nieuwe adressen.
      if (res.emails.length > 0) {
        fetch(DNC_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'bulk',
            company_name: companyName,
            emails: res.emails,
            ...localeInfo,
          }),
        }).catch(() => {})
      }
      setText('')
      areaRef.current?.focus()
    })
  }

  return (
    <div className="shrink-0 overflow-hidden rounded-panel border border-line bg-panel">
      <div className="px-4 pt-3.5">
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">{t('dnc.addTitle')}</h3>
        <p className="mt-[5px] text-[11.5px] leading-[1.5] text-muted">
          {t('dnc.addHint', { example: 'bedrijf.nl' })}
        </p>
      </div>

      <div className="px-4 pt-3">
        <textarea
          ref={areaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          spellCheck={false}
          placeholder={t('dnc.addPlaceholder')}
          aria-label={t('dnc.addTitle')}
          className="block min-h-[82px] w-full resize-y rounded-[9px] border border-line bg-track px-3 py-2.5 font-mono text-[12.5px] leading-[1.7] text-fg outline-none placeholder:text-faint focus:ring-2 focus:ring-[var(--brand-color)]"
        />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2.5">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-[9px] py-[3px] text-[11px] font-medium ${TONE[chip.tone]}`}
            >
              {chip.tone !== 'muted' && (
                <span className={`h-[5px] w-[5px] rounded-full ${DOT[chip.tone]}`} />
              )}
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Wat er niet bij komt staat onder het veld, niet eroverheen: bij lange
          of afgebroken regels loopt een overlay uit de pas met het tekstvak. */}
      {(parsed.duplicates.length > 0 || parsed.invalid.length > 0) && (
        <div className="px-4 pt-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            {t('dnc.notAdded')}
          </div>
          <ul className="mt-1.5 max-h-24 overflow-y-auto font-mono text-[11.5px] leading-[1.6]">
            {parsed.duplicates.map((value, i) => (
              <li key={`dup-${value}-${i}`} className="truncate text-faint line-through">
                {value}
              </li>
            ))}
            {parsed.invalid.map((raw, i) => (
              <li key={`bad-${raw}-${i}`} className="truncate text-neg">
                {raw}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="px-4 pt-2.5 text-[11.5px] text-neg">{error}</p>}

      <div className="flex items-center gap-[9px] px-4 pb-3.5 pt-3">
        <button
          type="button"
          onClick={submit}
          disabled={parsed.addCount === 0 || pending}
          className="h-[34px] flex-1 rounded-control bg-brand text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-45"
        >
          {pending
            ? t('dnc.addBusy')
            : parsed.addCount === 0
              ? t('dnc.addButton')
              : t('dnc.addButtonCount', { count: parsed.addCount })}
        </button>
        <button
          type="button"
          onClick={() => setText('')}
          disabled={!text}
          className="h-[34px] rounded-control border border-line bg-panel px-[13px] text-[12.5px] font-medium text-muted transition-colors hover:bg-[var(--brand-08)] disabled:opacity-45"
        >
          {t('dnc.clearInput')}
        </button>
      </div>
    </div>
  )
}
