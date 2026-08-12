'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { renderInline } from '@/lib/kix/inline'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Typografie-klassen; gelden voor zowel het invoerveld als de weergave. */
  className?: string
  /** Enter zonder shift: nieuw item in plaats van een nieuwe regel. */
  onEnter?: () => void
  /** Backspace in een leeg veld, bv. om het lijstitem te verwijderen. */
  onBackspaceEmpty?: () => void
  /** Direct in bewerkmodus openen, voor een net toegevoegd blok. */
  autoEdit?: boolean
  /** Ruwe tekst tonen zonder opmaak-interpretatie (codeblok). */
  plain?: boolean
}

/**
 * Klik om te typen, klik weg om de opmaak te zien. Het invoerveld en de
 * weergave delen hun typografie-klassen, zodat de tekst niet verspringt op het
 * moment van wisselen.
 */
export function EditableText({
  value,
  onChange,
  placeholder = 'Typ hier…',
  className = '',
  onEnter,
  onBackspaceEmpty,
  autoEdit = false,
  plain = false,
}: Props) {
  const [editing, setEditing] = useState(autoEdit)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Meegroeien met de inhoud; een vaste hoogte zou bij plakken tekst verbergen.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, editing])

  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [editing])

  if (editing) {
    return (
      <textarea
        ref={ref}
        value={value}
        rows={1}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (onEnter && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onEnter()
            return
          }
          if (onBackspaceEmpty && e.key === 'Backspace' && value.length === 0) {
            e.preventDefault()
            onBackspaceEmpty()
            return
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
          }
        }}
        placeholder={placeholder}
        className={`w-full resize-none border-0 bg-transparent p-0 outline-none placeholder:text-gray-300 focus:ring-0 ${className}`}
      />
    )
  }

  return (
    <div
      role="textbox"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onFocus={() => setEditing(true)}
      className={`w-full cursor-text whitespace-pre-wrap break-words outline-none ${className}`}
    >
      {plain ? value || <span className="text-gray-300">{placeholder}</span>
        : renderInline(value) ?? <span className="text-gray-300">{placeholder}</span>}
    </div>
  )
}
