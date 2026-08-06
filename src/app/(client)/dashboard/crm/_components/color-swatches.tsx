'use client'

import { CRM_COLOR_PALETTE } from '../_lib/constants'

export function ColorSwatches({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CRM_COLOR_PALETTE.map((c) => {
        const active = c.value.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            title={c.name}
            aria-label={c.name}
            aria-pressed={active}
            className={`h-6 w-6 rounded-full ring-offset-2 transition ${
              active ? 'ring-2 ring-gray-900' : 'ring-1 ring-gray-200 hover:ring-gray-400'
            }`}
            style={{ backgroundColor: c.value }}
          />
        )
      })}
    </div>
  )
}
