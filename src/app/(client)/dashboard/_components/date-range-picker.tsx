'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useT } from '@/lib/i18n/client'

interface DateRangePickerProps {
  currentRange: string
}

export function DateRangePicker({ currentRange }: DateRangePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useT()
  const PRESETS = [
    { label: t('overview.range7d'), value: '7d' },
    { label: t('overview.range30d'), value: '30d' },
    { label: t('overview.range90d'), value: '90d' },
    { label: t('overview.rangeAll'), value: 'all' },
  ]

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') {
      params.delete('range')
    } else {
      params.set('range', value)
    }
    params.delete('from')
    params.delete('to')
    router.push(`/dashboard?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="text-[12.5px] text-muted">{t('overview.period')}</span>
      <div className="flex overflow-hidden rounded-control border border-line bg-panel">
        {PRESETS.map((preset, i) => {
          const isActive =
            currentRange === preset.value ||
            (currentRange === '' && preset.value === '30d')
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => handleSelect(preset.value)}
              className={`px-3.5 py-2 text-xs transition-colors ${
                i < PRESETS.length - 1 ? 'border-r border-line' : ''
              } ${
                isActive
                  ? 'bg-[var(--brand-10)] font-semibold text-brand'
                  : 'font-medium text-muted hover:bg-[var(--brand-08)]'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
