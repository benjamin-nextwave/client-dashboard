'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createBlock, duplicateBlock, type KixBlock, type KixBlockType, type KixPage } from '@/lib/kix/types'
import { saveKixPage } from '../../actions'
import { AddBlockMenu } from './add-block-menu'
import { BlockView } from './block-view'

interface Props {
  clientId: string
  companyName: string
  page: KixPage
}

type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error'

const SAVE_DELAY_MS = 900

export function KixEditor({ clientId, companyName, page }: Props) {
  const [title, setTitle] = useState(page.title)
  const [icon, setIcon] = useState(page.icon)
  const [blocks, setBlocks] = useState<KixBlock[]>(page.blocks)
  const [status, setStatus] = useState<SaveStatus>('clean')
  const [savedAt, setSavedAt] = useState(page.updatedAt)
  const [error, setError] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  // Elke bewerking hoogt `version` op; een geslaagde opslag legt vast tot welke
  // versie hij kwam. Zolang die twee verschillen is er werk te doen. Een tellen
  // in plaats van een ja/nee-vlag, omdat er tijdens het opslaan doorgetypt kan
  // worden — met een vlag zou die wijziging als "opgeslagen" gelden en stil
  // verloren gaan.
  const version = useRef(0)
  const savedVersion = useRef(0)
  const inFlight = useRef(false)
  const latest = useRef({ title, icon, blocks })
  latest.current = { title, icon, blocks }

  const markDirty = () => {
    version.current += 1
    setStatus('dirty')
  }

  const save = useCallback(async () => {
    // Twee overlappende schrijfacties kunnen in willekeurige volgorde
    // aankomen, waardoor een oudere versie de nieuwste overschrijft.
    if (inFlight.current) return
    const attempt = version.current
    if (attempt === savedVersion.current) return

    inFlight.current = true
    setStatus('saving')
    try {
      const result = await saveKixPage(clientId, page.id, latest.current)
      if (result.error) {
        setError(result.error)
        setStatus('error')
        return
      }
      savedVersion.current = attempt
      setError(null)
      setSavedAt(result.savedAt ?? new Date().toISOString())
      // Tijdens het opslaan doorgetypt? Dan staat er alweer werk klaar.
      setStatus(version.current === attempt ? 'saved' : 'dirty')
    } finally {
      inFlight.current = false
    }
  }, [clientId, page.id])

  // `status` staat bewust in de dependencies: zodra een opslag klaar is draait
  // dit effect opnieuw en pakt het eventueel nagekomen werk op.
  useEffect(() => {
    if (version.current === savedVersion.current) return
    const timer = setTimeout(() => { void save() }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [title, icon, blocks, status, save])

  // Ctrl/Cmd+S slaat direct op in plaats van de browser-download te openen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  // Waarschuwen bij wegklikken met onopgeslagen werk.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (version.current === savedVersion.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  // ---------------------------------------------------------------------
  // Bewerkingen op de bloklijst
  // ---------------------------------------------------------------------

  const updateBlock = (index: number, next: KixBlock) => {
    markDirty()
    setBlocks((current) => current.map((b, i) => (i === index ? next : b)))
  }

  const insertBlock = (type: KixBlockType, atIndex: number) => {
    markDirty()
    const block = createBlock(type)
    setBlocks((current) => {
      const next = [...current]
      next.splice(atIndex, 0, block)
      return next
    })
    setFocusId(block.id)
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= blocks.length) return
    markDirty()
    setBlocks((current) => {
      const next = [...current]
      const [moved] = next.splice(index, 1)
      next.splice(target, 0, moved)
      return next
    })
  }

  const copyBlock = (index: number) => {
    markDirty()
    setBlocks((current) => {
      const next = [...current]
      next.splice(index + 1, 0, duplicateBlock(current[index]))
      return next
    })
  }

  const removeBlock = (index: number) => {
    markDirty()
    setBlocks((current) => current.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/admin/clients/${clientId}/kix`}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
        >
          <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Alle KIX-pagina&apos;s van {companyName}
        </Link>
        <SaveIndicator status={status} savedAt={savedAt} onSave={() => void save()} />
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          Opslaan mislukt: {error}
        </div>
      )}

      {/* Titelbalk */}
      <header className="flex items-start gap-3 border-b border-gray-200 pb-4">
        <input
          value={icon}
          onChange={(e) => {
            setIcon(e.target.value.slice(0, 4))
            markDirty()
          }}
          aria-label="Icoon"
          className="w-12 flex-shrink-0 rounded-lg border border-transparent bg-transparent py-1 text-center text-3xl outline-none transition-colors hover:border-gray-200 focus:border-indigo-300"
        />
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            markDirty()
          }}
          placeholder="Naamloze pagina"
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-2xl font-semibold tracking-tight text-gray-900 outline-none placeholder:text-gray-300"
        />
      </header>

      {/* Blokken */}
      <div className="space-y-1">
        {blocks.length === 0 && (
          <p className="pb-2 text-sm text-gray-400">
            Nog geen inhoud. Voeg hieronder je eerste blok toe.
          </p>
        )}

        {blocks.map((block, index) => (
          <div key={block.id}>
            {index > 0 && <AddBlockMenu subtle onPick={(type) => insertBlock(type, index)} />}

            <div className="group relative rounded-lg px-2 py-1 transition-colors hover:bg-gray-50/60">
              {/* Zwevende bediening per blok */}
              <div className="absolute -top-3 right-1 z-10 hidden gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm group-hover:flex">
                <ControlButton label="Omhoog" onClick={() => moveBlock(index, -1)} disabled={index === 0}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </ControlButton>
                <ControlButton
                  label="Omlaag"
                  onClick={() => moveBlock(index, 1)}
                  disabled={index === blocks.length - 1}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </ControlButton>
                <ControlButton label="Dupliceren" onClick={() => copyBlock(index)}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m0 0H5.625" />
                </ControlButton>
                <ControlButton label="Verwijderen" onClick={() => removeBlock(index)} danger>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </ControlButton>
              </div>

              <BlockView
                block={block}
                autoEdit={focusId === block.id}
                onChange={(next) => updateBlock(index, next)}
                onAddAfter={() => insertBlock('paragraph', index + 1)}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-1">
        <AddBlockMenu onPick={(type) => insertBlock(type, blocks.length)} />
      </div>

      <p className="border-t border-gray-100 pt-4 text-[11px] leading-relaxed text-gray-400">
        Opmaak binnen een tekstblok: <code className="font-mono">**vet**</code>,{' '}
        <code className="font-mono">*cursief*</code>, <code className="font-mono">`code`</code>,{' '}
        <code className="font-mono">~~doorgestreept~~</code>, <code className="font-mono">==markering==</code> en{' '}
        <code className="font-mono">[tekst](https://…)</code>. Klik op een blok om te typen, klik ernaast om de opmaak
        te zien. Opslaan gaat vanzelf; Ctrl+S doet het direct.
      </p>
    </div>
  )
}

function ControlButton({
  label,
  onClick,
  disabled = false,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1 transition-colors disabled:opacity-25 ${
        danger ? 'text-gray-400 hover:bg-rose-50 hover:text-rose-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        {children}
      </svg>
    </button>
  )
}

function SaveIndicator({
  status,
  savedAt,
  onSave,
}: {
  status: SaveStatus
  savedAt: string
  onSave: () => void
}) {
  if (status === 'saving') {
    return <span className="text-[11px] font-semibold text-gray-400">Opslaan…</span>
  }
  if (status === 'error') {
    return (
      <button
        type="button"
        onClick={onSave}
        className="rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"
      >
        Opnieuw opslaan
      </button>
    )
  }
  if (status === 'dirty') {
    return (
      <button
        type="button"
        onClick={onSave}
        className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
      >
        Nu opslaan
      </button>
    )
  }
  return (
    <span className="text-[11px] text-gray-400">
      {status === 'saved' ? 'Opgeslagen' : 'Bijgewerkt'} ·{' '}
      {new Intl.DateTimeFormat('nl-NL', { hour: '2-digit', minute: '2-digit' }).format(new Date(savedAt))}
    </span>
  )
}
