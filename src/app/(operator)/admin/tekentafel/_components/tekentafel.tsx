'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createSketch, deleteSketch, updateSketch, type Sketch } from '../actions'

export type SketchClient = {
  id: string
  name: string
  color: string | null
  logo: string | null
}

type SaveStatus = 'saved' | 'saving' | 'unsaved'
type Mode = 'template' | 'example'

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface TekentafelProps {
  clients: SketchClient[]
  initialSketches: Sketch[]
}

export function Tekentafel({ clients, initialSketches }: TekentafelProps) {
  const [sketches, setSketches] = useState<Sketch[]>(initialSketches)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('template')
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Refs houden de meest recente waarden vast zodat de debounced save-closure
  // geen verouderde state gebruikt.
  const sketchesRef = useRef(sketches)
  const selectedIdRef = useRef(selectedId)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dirtyRef = useRef<Sketch | null>(null)

  useEffect(() => {
    sketchesRef.current = sketches
  }, [sketches])
  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  )

  const clientSketches = useMemo(
    () =>
      sketches
        .filter((s) => s.clientId === selectedClientId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sketches, selectedClientId]
  )

  const selected = useMemo(
    () => sketches.find((s) => s.id === selectedId) ?? null,
    [sketches, selectedId]
  )

  // --- Opslaan ------------------------------------------------------------
  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const target = dirtyRef.current
    if (!target) return
    dirtyRef.current = null
    setStatus('saving')
    const res = await updateSketch(target.id, {
      title: target.title,
      templateContent: target.templateContent,
      exampleContent: target.exampleContent,
    })
    if (res.ok) {
      // Alleen 'saved' tonen als er ondertussen niets nieuws is getypt.
      setStatus(dirtyRef.current ? 'unsaved' : 'saved')
    } else {
      setError(res.error)
      setStatus('unsaved')
    }
  }, [])

  const scheduleSave = useCallback(
    (sketch: Sketch) => {
      dirtyRef.current = sketch
      setStatus('unsaved')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void flush()
      }, 800)
    },
    [flush]
  )

  // Spoel openstaande wijzigingen weg bij het verlaten van de pagina.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const patchSelected = useCallback(
    (patch: Partial<Pick<Sketch, 'title' | 'templateContent' | 'exampleContent'>>) => {
      const id = selectedIdRef.current
      const current = sketchesRef.current.find((s) => s.id === id)
      if (!current) return
      const updated = { ...current, ...patch }
      setSketches((prev) => prev.map((s) => (s.id === id ? updated : s)))
      scheduleSave(updated)
    },
    [scheduleSave]
  )

  // --- Navigatie ----------------------------------------------------------
  const handleSelectClient = useCallback(
    (id: string) => {
      void flush()
      setSelectedClientId(id)
      setSelectedId(null)
      setMode('template')
      setError(null)
    },
    [flush]
  )

  const handleSelectSketch = useCallback(
    (id: string) => {
      void flush()
      setSelectedId(id)
      setMode('template')
      setError(null)
    },
    [flush]
  )

  const handleNewSketch = useCallback(async () => {
    if (!selectedClientId) return
    await flush()
    setBusy(true)
    const res = await createSketch(selectedClientId)
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSketches((prev) => [res.value, ...prev])
    setSelectedId(res.value.id)
    setMode('template')
    setStatus('saved')
  }, [selectedClientId, flush])

  const handleDeleteSketch = useCallback(
    async (id: string, title: string) => {
      const ok = window.confirm(`Schets "${title || 'Naamloze schets'}" verwijderen? Dit kan niet ongedaan worden gemaakt.`)
      if (!ok) return
      setBusy(true)
      const res = await deleteSketch(id)
      setBusy(false)
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (dirtyRef.current?.id === id) dirtyRef.current = null
      setSketches((prev) => prev.filter((s) => s.id !== id))
      if (selectedIdRef.current === id) {
        setSelectedId(null)
        setStatus('saved')
      }
    },
    []
  )

  const activeText = selected
    ? mode === 'template'
      ? selected.templateContent
      : selected.exampleContent
    : ''
  const wordCount = countWords(activeText)
  const charCount = activeText.length

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-gray-50">
      {/* Topbar */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
            >
              <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              Terug
            </Link>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
              <h1 className="text-base font-bold tracking-tight text-gray-900">De tekentafel</h1>
            </div>
          </div>

          {/* Klant kiezen */}
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            Klant
            <select
              value={selectedClientId}
              onChange={(e) => handleSelectClient(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">— Kies een klant —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="mx-auto mt-3 w-full max-w-[1600px] px-6 lg:px-10">
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700" aria-label="Sluiten">✕</button>
          </div>
        </div>
      )}

      {!selectedClient ? (
        <div className="flex flex-1 items-center justify-center px-6 py-20 text-center">
          <div className="max-w-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
              <svg className="h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Kies een klant om te beginnen</h2>
            <p className="mt-1 text-sm text-gray-500">
              Selecteer rechtsboven een klant. Daarna kun je mailvarianten uitschrijven en bewaren.
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-6 py-6 lg:px-10">
          {/* Sidebar: schetsen */}
          <aside className="w-64 shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Schetsen</h2>
              <button
                onClick={handleNewSketch}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nieuw
              </button>
            </div>

            {clientSketches.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400">
                Nog geen schetsen voor deze klant.
              </p>
            ) : (
              <ul className="space-y-1">
                {clientSketches.map((s) => {
                  const active = s.id === selectedId
                  return (
                    <li key={s.id} className="group relative">
                      <button
                        onClick={() => handleSelectSketch(s.id)}
                        className={`w-full rounded-lg border px-3 py-2 pr-8 text-left transition-colors ${
                          active
                            ? 'border-indigo-300 bg-indigo-50'
                            : 'border-transparent hover:border-gray-200 hover:bg-white'
                        }`}
                      >
                        <div className={`truncate text-sm font-semibold ${active ? 'text-indigo-900' : 'text-gray-800'}`}>
                          {s.title || 'Naamloze schets'}
                        </div>
                        <div className="mt-0.5 text-[11px] text-gray-400">{formatWhen(s.updatedAt)}</div>
                      </button>
                      <button
                        onClick={() => handleDeleteSketch(s.id, s.title)}
                        disabled={busy}
                        aria-label="Schets verwijderen"
                        title="Verwijderen"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-300 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-0"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          {/* Editor */}
          <main className="flex min-w-0 flex-1 flex-col">
            {!selected ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center">
                <div className="max-w-xs px-6 py-16">
                  <p className="text-sm font-semibold text-gray-700">Geen schets geopend</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Kies links een schets of maak een nieuwe aan met de knop “Nieuw”.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* Editor header */}
                <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4">
                  <input
                    value={selected.title}
                    onChange={(e) => patchSelected({ title: e.target.value })}
                    placeholder="Titel van de schets…"
                    className="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-0"
                  />

                  {/* Status */}
                  <span className="text-xs font-medium text-gray-400">
                    {status === 'saving' && 'Opslaan…'}
                    {status === 'unsaved' && 'Niet opgeslagen'}
                    {status === 'saved' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Opgeslagen
                      </span>
                    )}
                  </span>

                  <button
                    onClick={() => void flush()}
                    disabled={status !== 'unsaved'}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 6h-15m15 0a2.25 2.25 0 0 1 0 4.5h-15a2.25 2.25 0 0 1 0-4.5m15 0v9.75A2.25 2.25 0 0 1 17.25 18H6.75A2.25 2.25 0 0 1 4.5 15.75V6m4.5 6h6" />
                    </svg>
                    Opslaan
                  </button>
                </div>

                {/* Template / Voorbeeld toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                  <div className="inline-flex rounded-full border border-gray-200 bg-gray-50 p-1">
                    <button
                      onClick={() => setMode('template')}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                        mode === 'template' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Template
                    </button>
                    <button
                      onClick={() => setMode('example')}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                        mode === 'example' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Voorbeeld
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    {mode === 'template'
                      ? 'Schrijf hier de variabelen, bijv. {{voornaam}} of {{bedrijf}}.'
                      : 'Schrijf hier de variabelen volledig uit als een echt voorbeeld.'}
                  </p>
                </div>

                {/* Tekstvak */}
                <div className="flex flex-1 flex-col px-5 py-4">
                  <textarea
                    value={activeText}
                    onChange={(e) =>
                      patchSelected(
                        mode === 'template'
                          ? { templateContent: e.target.value }
                          : { exampleContent: e.target.value }
                      )
                    }
                    placeholder={
                      mode === 'template'
                        ? 'Typ hier je mailvariant met variabelen…'
                        : 'Typ hier je uitgeschreven voorbeeld…'
                    }
                    className="min-h-[45vh] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50/50 p-4 font-mono text-sm leading-relaxed text-gray-900 placeholder:text-gray-300 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />

                  {/* Woordteller */}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>
                      <span className="font-semibold text-gray-600">{wordCount}</span>{' '}
                      {wordCount === 1 ? 'woord' : 'woorden'}
                      <span className="mx-2 text-gray-300">·</span>
                      <span className="font-semibold text-gray-600">{charCount}</span> tekens
                    </span>
                    <span>Laatst bewerkt: {formatWhen(selected.updatedAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}
