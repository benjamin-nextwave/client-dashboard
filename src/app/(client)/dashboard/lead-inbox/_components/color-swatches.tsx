'use client'

import { COLOR_PALETTE } from '../_lib/palette'

export function ColorSwatches({
  value,
  onChange,
  size = 'md',
}: {
  value: string
  onChange: (color: string) => void
  size?: 'sm' | 'md'
}) {
  const dim = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_PALETTE.map((c) => {
        const selected = c.value === value
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            aria-label={c.name}
            title={c.name}
            className={`${dim} rounded-full border-2 transition-transform ${
              selected ? 'border-gray-900 scale-110' : 'border-white hover:scale-110'
            }`}
            style={{ backgroundColor: c.value, boxShadow: '0 0 0 1px #e5e7eb' }}
          />
        )
      })}
    </div>
  )
}
