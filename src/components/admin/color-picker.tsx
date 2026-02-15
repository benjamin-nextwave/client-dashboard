'use client'

import { useState } from 'react'

interface ColorPickerProps {
  name: string
  defaultValue?: string
}

export function ColorPicker({ name, defaultValue = '#3B82F6' }: ColorPickerProps) {
  const [color, setColor] = useState(defaultValue)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        Primaire kleur
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded border border-gray-300"
        />
        <input
          type="text"
          name={name}
          value={color}
          onChange={(e) => {
            const val = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              setColor(val)
            }
          }}
          className="block w-28 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="#3B82F6"
        />
      </div>
    </div>
  )
}
