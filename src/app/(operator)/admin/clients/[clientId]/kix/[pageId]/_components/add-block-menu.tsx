'use client'

import { useEffect, useRef, useState } from 'react'
import type { KixBlockType } from '@/lib/kix/types'

interface Props {
  onPick: (type: KixBlockType) => void
  /** Compacte variant tussen twee bestaande blokken. */
  subtle?: boolean
}

const GROUPS: Array<{
  label: string
  items: Array<{ type: KixBlockType; label: string; hint: string; glyph: string }>
}> = [
  {
    label: 'Tekst',
    items: [
      { type: 'paragraph', label: 'Tekst', hint: 'Gewone alinea', glyph: '¶' },
      { type: 'heading', label: 'Kop', hint: 'Drie formaten', glyph: 'H' },
      { type: 'quote', label: 'Citaat', hint: 'Inspringende regel', glyph: '❝' },
      { type: 'code', label: 'Code', hint: 'Monospace op donker', glyph: '{ }' },
    ],
  },
  {
    label: 'Lijsten',
    items: [
      { type: 'list', label: 'Lijst', hint: 'Bolletjes, nummers of vinkjes', glyph: '☰' },
    ],
  },
  {
    label: 'Structuur',
    items: [
      { type: 'table', label: 'Tabel', hint: 'Rijen en kolommen', glyph: '▦' },
      { type: 'toggle', label: 'Inklapbaar', hint: 'Verbergt de inhoud', glyph: '▸' },
      { type: 'columns', label: 'Twee kolommen', hint: 'Naast elkaar', glyph: '◫' },
      { type: 'divider', label: 'Scheidingslijn', hint: 'Horizontale streep', glyph: '—' },
    ],
  },
  {
    label: 'Visueel',
    items: [
      { type: 'drawing', label: 'Tekening', hint: 'Pen, vormen en pijlen', glyph: '✎' },
      { type: 'flow', label: 'Stappenschema', hint: 'Stappen met pijlen', glyph: '⇢' },
      { type: 'progress', label: 'Voortgangsbalk', hint: 'Percentage', glyph: '▭' },
      { type: 'callout', label: 'Aandachtsblok', hint: 'Gekleurd kader', glyph: '★' },
      { type: 'image', label: 'Afbeelding', hint: 'Via URL', glyph: '🖼' },
      { type: 'bookmark', label: 'Link', hint: 'Kaartje met URL', glyph: '🔗' },
    ],
  },
]

export function AddBlockMenu({ onPick, subtle = false }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Buiten het menu klikken sluit het; anders blijft het openstaan terwijl je
  // verderop in de pagina typt.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // De invoegstreep tussen twee blokken blijft verborgen tot je er met de muis
  // overheen gaat — maar zodra het menu openstaat moet hij zichtbaar blijven,
  // anders verdwijnt het geopende menu onder je cursor vandaan.
  const wrapperClass = subtle && !open ? 'relative opacity-0 hover:opacity-100 focus-within:opacity-100' : 'relative'

  return (
    <div ref={containerRef} className={wrapperClass}>
      {subtle ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2 py-1 text-gray-300 transition-colors hover:text-indigo-500"
        >
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border border-current text-[10px] leading-none">
            +
          </span>
          <span className="h-px flex-1 bg-current opacity-40" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Blok toevoegen
        </button>
      )}

      {open && (
        <div className="absolute left-0 z-20 mt-1 max-h-[26rem] w-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-1 last:mb-0">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {group.label}
              </div>
              {group.items.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => {
                    onPick(item.type)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs text-gray-600">
                    {item.glyph}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900">{item.label}</span>
                    <span className="block truncate text-[11px] text-gray-400">{item.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
