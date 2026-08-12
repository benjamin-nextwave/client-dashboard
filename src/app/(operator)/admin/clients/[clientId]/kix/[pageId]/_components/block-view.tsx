'use client'

import { useState } from 'react'
import { kixId, type KixBlock, type KixCalloutTone, type KixListStyle } from '@/lib/kix/types'
import { EditableText } from './editable-text'
import { DrawingBlock } from './drawing-block'

interface Props {
  block: KixBlock
  onChange: (block: KixBlock) => void
  /** Voegt een leeg tekstblok toe onder dit blok (Enter aan het eind van een lijst). */
  onAddAfter: () => void
  autoEdit: boolean
}

const CALLOUT_TONES: Record<KixCalloutTone, { label: string; box: string; text: string }> = {
  info: { label: 'Blauw', box: 'border-sky-200 bg-sky-50', text: 'text-sky-900' },
  warn: { label: 'Oranje', box: 'border-amber-200 bg-amber-50', text: 'text-amber-900' },
  error: { label: 'Rood', box: 'border-rose-200 bg-rose-50', text: 'text-rose-900' },
  success: { label: 'Groen', box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-900' },
  note: { label: 'Grijs', box: 'border-gray-200 bg-gray-50', text: 'text-gray-700' },
}

const LIST_STYLES: Array<{ id: KixListStyle; label: string }> = [
  { id: 'bullet', label: 'Bolletjes' },
  { id: 'number', label: 'Nummers' },
  { id: 'check', label: 'Vinkjes' },
]

export function BlockView({ block, onChange, onAddAfter, autoEdit }: Props) {
  switch (block.type) {
    // -----------------------------------------------------------------------
    case 'paragraph':
      return (
        <EditableText
          value={block.text}
          onChange={(text) => onChange({ ...block, text })}
          autoEdit={autoEdit}
          placeholder="Typ tekst… (**vet**, *cursief*, `code`, ==markering==)"
          className="text-sm leading-relaxed text-gray-700"
        />
      )

    // -----------------------------------------------------------------------
    case 'heading': {
      const sizes = {
        1: 'text-2xl font-semibold tracking-tight text-gray-900',
        2: 'text-lg font-semibold text-gray-900',
        3: 'text-sm font-semibold uppercase tracking-wide text-gray-500',
      } as const
      return (
        <div className="group/heading flex items-start gap-2">
          <div className="flex flex-shrink-0 gap-0.5 pt-1 opacity-0 transition-opacity group-hover/heading:opacity-100">
            {([1, 2, 3] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ ...block, level })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                  block.level === level ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                H{level}
              </button>
            ))}
          </div>
          <EditableText
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            autoEdit={autoEdit}
            placeholder="Kop"
            className={sizes[block.level]}
          />
        </div>
      )
    }

    // -----------------------------------------------------------------------
    case 'quote':
      return (
        <div className="border-l-4 border-gray-300 pl-4">
          <EditableText
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
            autoEdit={autoEdit}
            placeholder="Citaat"
            className="text-sm italic leading-relaxed text-gray-600"
          />
        </div>
      )

    // -----------------------------------------------------------------------
    case 'callout': {
      const tone = CALLOUT_TONES[block.tone]
      return (
        <div className={`group/callout rounded-xl border px-4 py-3 ${tone.box}`}>
          <div className="flex items-start gap-3">
            <input
              value={block.emoji}
              onChange={(e) => onChange({ ...block, emoji: e.target.value.slice(0, 4) })}
              className="w-8 flex-shrink-0 border-0 bg-transparent p-0 text-center text-lg outline-none"
              aria-label="Icoon"
            />
            <EditableText
              value={block.text}
              onChange={(text) => onChange({ ...block, text })}
              autoEdit={autoEdit}
              placeholder="Aandachtspunt"
              className={`text-sm leading-relaxed ${tone.text}`}
            />
          </div>
          <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover/callout:opacity-100">
            {(Object.keys(CALLOUT_TONES) as KixCalloutTone[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ ...block, tone: t })}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                  block.tone === t ? 'bg-white/80 text-gray-900 ring-1 ring-gray-300' : 'text-gray-500 hover:bg-white/60'
                }`}
              >
                {CALLOUT_TONES[t].label}
              </button>
            ))}
          </div>
        </div>
      )
    }

    // -----------------------------------------------------------------------
    case 'code':
      return (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-1.5">
            <input
              value={block.language}
              onChange={(e) => onChange({ ...block, language: e.target.value })}
              placeholder="taal"
              className="w-32 border-0 bg-transparent p-0 font-mono text-[11px] text-gray-400 outline-none placeholder:text-gray-600"
            />
          </div>
          <div className="px-3 py-2.5">
            <EditableText
              value={block.text}
              onChange={(text) => onChange({ ...block, text })}
              autoEdit={autoEdit}
              plain
              placeholder="Code…"
              className="font-mono text-[12.5px] leading-relaxed text-gray-100"
            />
          </div>
        </div>
      )

    // -----------------------------------------------------------------------
    case 'divider':
      return (
        <div className="py-2">
          <hr className="border-gray-200" />
        </div>
      )

    // -----------------------------------------------------------------------
    case 'list':
      return <ListBlock block={block} onChange={onChange} onAddAfter={onAddAfter} autoEdit={autoEdit} />


    // -----------------------------------------------------------------------
    case 'table': {
      const setCell = (rowIndex: number, colIndex: number, value: string) => {
        const rows = block.rows.map((row, r) =>
          r === rowIndex ? row.map((cell, c) => (c === colIndex ? value : cell)) : row
        )
        onChange({ ...block, rows })
      }
      const addRow = () => onChange({ ...block, rows: [...block.rows, block.columns.map(() => '')] })
      const addColumn = () =>
        onChange({
          ...block,
          columns: [...block.columns, `Kolom ${block.columns.length + 1}`],
          rows: block.rows.map((r) => [...r, '']),
        })
      const removeRow = (index: number) =>
        onChange({ ...block, rows: block.rows.filter((_, i) => i !== index) })
      const removeColumn = (index: number) => {
        if (block.columns.length === 1) return
        onChange({
          ...block,
          columns: block.columns.filter((_, i) => i !== index),
          rows: block.rows.map((r) => r.filter((_, i) => i !== index)),
        })
      }

      return (
        <div className="group/table">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {block.columns.map((col, colIndex) => (
                    <th
                      key={colIndex}
                      className="group/col relative border-b border-r border-gray-200 p-0 last:border-r-0"
                    >
                      <input
                        value={col}
                        onChange={(e) =>
                          onChange({
                            ...block,
                            columns: block.columns.map((c, i) => (i === colIndex ? e.target.value : c)),
                          })
                        }
                        className="w-full min-w-[8rem] border-0 bg-transparent px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 outline-none focus:bg-white"
                      />
                      {block.columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(colIndex)}
                          title="Kolom verwijderen"
                          className="absolute right-1 top-1 hidden rounded p-0.5 text-gray-400 hover:bg-rose-100 hover:text-rose-600 group-hover/col:block"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="group/row border-b border-gray-100 last:border-0">
                    {row.map((cell, colIndex) => (
                      <td key={colIndex} className="relative border-r border-gray-100 p-0 last:border-r-0">
                        <input
                          value={cell}
                          onChange={(e) => setCell(rowIndex, colIndex, e.target.value)}
                          className="w-full min-w-[8rem] border-0 bg-transparent px-3 py-2 text-gray-700 outline-none focus:bg-indigo-50/40"
                        />
                        {colIndex === row.length - 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(rowIndex)}
                            title="Rij verwijderen"
                            className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-rose-100 hover:text-rose-600 group-hover/row:block"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-1.5 flex gap-3">
            <button
              type="button"
              onClick={addRow}
              className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-indigo-600"
            >
              + rij
            </button>
            <button
              type="button"
              onClick={addColumn}
              className="text-[11px] font-semibold text-gray-400 transition-colors hover:text-indigo-600"
            >
              + kolom
            </button>
          </div>
        </div>
      )
    }

    // -----------------------------------------------------------------------
    case 'toggle':
      return (
        <div className="rounded-xl border border-gray-200">
          <div className="flex items-start gap-2 px-3 py-2">
            <button
              type="button"
              onClick={() => onChange({ ...block, open: !block.open })}
              className="mt-0.5 flex-shrink-0 rounded p-0.5 text-gray-400 transition-transform hover:bg-gray-100 hover:text-gray-700"
              style={{ transform: block.open ? 'rotate(90deg)' : undefined }}
              aria-label={block.open ? 'Inklappen' : 'Uitklappen'}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <EditableText
              value={block.title}
              onChange={(title) => onChange({ ...block, title })}
              autoEdit={autoEdit}
              placeholder="Inklapbare titel"
              className="text-sm font-semibold text-gray-900"
            />
          </div>
          {block.open && (
            <div className="border-t border-gray-100 px-3 py-2.5 pl-9">
              <EditableText
                value={block.text}
                onChange={(text) => onChange({ ...block, text })}
                placeholder="Verborgen inhoud"
                className="text-sm leading-relaxed text-gray-700"
              />
            </div>
          )}
        </div>
      )

    // -----------------------------------------------------------------------
    case 'columns':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 px-3 py-2.5">
            <EditableText
              value={block.left}
              onChange={(left) => onChange({ ...block, left })}
              autoEdit={autoEdit}
              placeholder="Linkerkolom"
              className="text-sm leading-relaxed text-gray-700"
            />
          </div>
          <div className="rounded-xl border border-gray-200 px-3 py-2.5">
            <EditableText
              value={block.right}
              onChange={(right) => onChange({ ...block, right })}
              placeholder="Rechterkolom"
              className="text-sm leading-relaxed text-gray-700"
            />
          </div>
        </div>
      )

    // -----------------------------------------------------------------------
    case 'drawing':
      return (
        <DrawingBlock
          strokes={block.strokes}
          height={block.height}
          onChange={(patch) => onChange({ ...block, ...patch })}
        />
      )

    // -----------------------------------------------------------------------
    case 'image':
      return (
        <div className="space-y-1.5">
          {block.url.trim().length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.url}
              alt={block.caption || 'Afbeelding'}
              className="max-h-[28rem] w-full rounded-xl border border-gray-200 object-contain"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-xs text-gray-400">
              Plak hieronder een afbeeldings-URL
            </div>
          )}
          <input
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="https://…"
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 font-mono text-[11px] text-gray-600 outline-none focus:border-indigo-300"
          />
          <EditableText
            value={block.caption}
            onChange={(caption) => onChange({ ...block, caption })}
            placeholder="Bijschrift"
            className="text-center text-[11px] text-gray-500"
          />
        </div>
      )

    // -----------------------------------------------------------------------
    case 'progress':
      return (
        <div className="rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <EditableText
              value={block.label}
              onChange={(label) => onChange({ ...block, label })}
              autoEdit={autoEdit}
              placeholder="Waar gaat deze balk over?"
              className="text-sm font-medium text-gray-700"
            />
            <span className="flex-shrink-0 text-sm font-semibold tabular-nums text-gray-900">
              {block.value}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
              style={{ width: `${block.value}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={block.value}
            onChange={(e) => onChange({ ...block, value: Number(e.target.value) })}
            className="mt-2 w-full accent-indigo-600"
          />
        </div>
      )

    // -----------------------------------------------------------------------
    case 'flow': {
      const setSteps = (steps: typeof block.steps) => onChange({ ...block, steps })
      return (
        <div className="rounded-xl border border-gray-200 px-3 py-3">
          <div className="flex flex-wrap items-stretch gap-2">
            {block.steps.map((step, index) => (
              <div key={step.id} className="flex items-stretch gap-2">
                <div className="group/step relative min-w-[9rem] max-w-[14rem] flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    Stap {index + 1}
                  </div>
                  <EditableText
                    value={step.text}
                    onChange={(text) => setSteps(block.steps.map((s) => (s.id === step.id ? { ...s, text } : s)))}
                    autoEdit={autoEdit && index === 0}
                    placeholder="Omschrijving"
                    className="mt-0.5 text-sm leading-snug text-gray-800"
                  />
                  {block.steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSteps(block.steps.filter((s) => s.id !== step.id))}
                      title="Stap verwijderen"
                      className="absolute -right-1.5 -top-1.5 hidden rounded-full border border-gray-200 bg-white p-0.5 text-gray-400 shadow-sm hover:text-rose-600 group-hover/step:block"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {index < block.steps.length - 1 && (
                  <div className="flex items-center text-gray-300">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setSteps([...block.steps, { id: kixId(), text: '' }])}
              className="min-w-[5rem] rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-semibold text-gray-400 transition-colors hover:border-indigo-300 hover:text-indigo-600"
            >
              + stap
            </button>
          </div>
        </div>
      )
    }

    // -----------------------------------------------------------------------
    case 'bookmark': {
      const href = /^https?:\/\//i.test(block.url.trim()) ? block.url.trim() : null
      return (
        <div className="rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <EditableText
                value={block.title}
                onChange={(title) => onChange({ ...block, title })}
                autoEdit={autoEdit}
                placeholder="Titel van de link"
                className="text-sm font-semibold text-gray-900"
              />
              <EditableText
                value={block.description}
                onChange={(description) => onChange({ ...block, description })}
                placeholder="Korte omschrijving"
                className="text-xs leading-relaxed text-gray-500"
              />
              <input
                value={block.url}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="https://…"
                className="mt-1 w-full border-0 bg-transparent p-0 font-mono text-[11px] text-gray-400 outline-none placeholder:text-gray-300"
              />
            </div>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:border-indigo-300 hover:text-indigo-600"
              >
                Openen
              </a>
            )}
          </div>
        </div>
      )
    }
  }
}

type ListBlockData = Extract<KixBlock, { type: 'list' }>

/**
 * Eigen component omdat de lijst moet onthouden welk item zojuist met Enter is
 * gemaakt: dat item opent direct in bewerkmodus, zodat de cursor meeloopt in
 * plaats van in het vorige item te blijven staan.
 */
function ListBlock({
  block,
  onChange,
  onAddAfter,
  autoEdit,
}: {
  block: ListBlockData
  onChange: (block: KixBlock) => void
  onAddAfter: () => void
  autoEdit: boolean
}) {
  const [freshId, setFreshId] = useState<string | null>(null)
  const setItems = (items: ListBlockData['items']) => onChange({ ...block, items })
  const done = block.items.filter((i) => i.checked).length

  const addItemAfter = (index: number) => {
    const item = { id: kixId(), text: '', checked: false }
    const next = [...block.items]
    next.splice(index + 1, 0, item)
    setFreshId(item.id)
    setItems(next)
  }

  return (
    <div className="group/list">
      <div className="mb-1 flex items-center gap-1 opacity-0 transition-opacity group-hover/list:opacity-100">
        {LIST_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange({ ...block, style: s.id })}
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              block.style === s.id ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100'
            }`}
          >
            {s.label}
          </button>
        ))}
        {block.style === 'check' && block.items.length > 0 && (
          <span className="ml-auto text-[11px] tabular-nums text-gray-400">
            {done}/{block.items.length} afgerond
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {block.items.map((item, index) => (
          <li key={item.id} className="flex items-start gap-2">
            {block.style === 'check' ? (
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setItems(block.items.map((i) => (i.id === item.id ? { ...i, checked: e.target.checked } : i)))
                }
                className="mt-1 h-3.5 w-3.5 flex-shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
            ) : block.style === 'number' ? (
              <span className="mt-0.5 w-4 flex-shrink-0 text-right text-sm tabular-nums text-gray-400">
                {index + 1}.
              </span>
            ) : (
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
            )}
            <EditableText
              value={item.text}
              onChange={(text) => setItems(block.items.map((i) => (i.id === item.id ? { ...i, text } : i)))}
              autoEdit={item.id === freshId || (autoEdit && index === 0)}
              placeholder="Item"
              className={`text-sm leading-relaxed ${
                item.checked ? 'text-gray-400 line-through' : 'text-gray-700'
              }`}
              onEnter={() => addItemAfter(index)}
              onBackspaceEmpty={() => {
                if (block.items.length === 1) {
                  onAddAfter()
                  return
                }
                setItems(block.items.filter((i) => i.id !== item.id))
              }}
            />
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => addItemAfter(block.items.length - 1)}
        className="mt-1.5 text-[11px] font-semibold text-gray-400 transition-colors hover:text-indigo-600"
      >
        + item
      </button>
    </div>
  )
}
