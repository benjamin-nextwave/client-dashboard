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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-gray-500">{t('overview.period')}</span>
      {PRESETS.map((preset) => {
        const isActive =
          currentRange === preset.value ||
          (currentRange === '' && preset.value === '30d')
        return (
          <button
            key={preset.value}
            type="button"
            onClick={() => handleSelect(preset.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[var(--brand-color)] text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
