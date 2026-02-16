'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const PRESETS = [
  { label: '7 dagen', value: '7d' },
  { label: '30 dagen', value: '30d' },
  { label: '90 dagen', value: '90d' },
  { label: 'Deze maand', value: 'month' },
  { label: 'Alles', value: 'all' },
] as const

interface DateRangePickerProps {
  currentRange: string
}

export function DateRangePicker({ currentRange }: DateRangePickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
      <span className="text-sm text-gray-500">Periode:</span>
      {PRESETS.map((preset) => {
        const isActive =
          currentRange === preset.value ||
          (currentRange === '' && preset.value === 'all')
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
