'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CampaignFlow } from '@/lib/data/campaign-flow'
import { createFlow, deleteFlow, updateFlowName } from '../actions'
import { FlowEditor } from './flow-editor'

interface Props {
  clientId: string
  flows: CampaignFlow[]
  selectedFlowId: string | null
}

export function FlowsManager({ clientId, flows, selectedFlowId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  const selectedFlow = flows.find((f) => f.id === selectedFlowId) ?? null

  const handleSelect = (flowId: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set('flow', flowId)
    router.push(url.pathname + url.search)
  }

  const handleCreate = () => {
    setError(null)
    const name = newName.trim() || 'Nieuwe campagne'
    startTransition(async () => {
      const result = await createFlow(clientId, name)
      if (result.error) {
        setError(result.error)
      } else {
        setShowNew(false)
        setNewName('')
        if (result.flowId) {
          const url = new URL(window.location.href)
          url.searchParams.set('flow', result.flowId)
          router.push(url.pathname + url.search)
          router.refresh()
        }
      }
    })
  }

  if (flows.length === 0) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-gray-900">Nog geen campagne-flows</h3>
          <p className="mt-1 text-sm text-gray-500">
            Maak een eerste campagne-flow aan voor deze klant. Je kunt er later meer toevoegen.
          </p>
          {!showNew ? (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-600"
            >
              + Nieuwe campagne aanmaken
            </button>
          ) : (
            <NewFlowForm
              name={newName}
              onChange={setNewName}
              onConfirm={handleCreate}
              onCancel={() => {
                setShowNew(false)
                setNewName('')
              }}
              pending={pending}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Flow tabs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {flows.map((f) => {
            const active = f.id === selectedFlowId
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelect(f.id)}
                disabled={pending}
                className={`group inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    f.isPublished
                      ? active
                        ? 'bg-emerald-300'
                        : 'bg-emerald-500'
                      : active
                        ? 'bg-white/50'
                        : 'bg-gray-300'
                  }`}
                />
                {f.name}
              </button>
            )
          })}

          {!showNew ? (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-3 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700 transition-all hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
            >
              + Nieuwe campagne
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 p-1.5">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Campagne naam"
                autoFocus
                disabled={pending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate()
                  if (e.key === 'Escape') {
                    setShowNew(false)
                    setNewName('')
                  }
                }}
                className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs font-medium focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={pending}
                className="rounded-md bg-indigo-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                Aanmaken
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNew(false)
                  setNewName('')
                }}
                disabled={pending}
                className="rounded-md p-1 text-indigo-700 hover:bg-indigo-100"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected flow editor */}
      {selectedFlow && (
        <FlowMeta flow={selectedFlow} onDeleted={() => router.refresh()} />
      )}
      {selectedFlow && (
        <FlowEditor
          key={selectedFlow.id}
          initialFlow={selectedFlow}
        />
      )}
    </div>
  )
}

function NewFlowForm({
  name,
  onChange,
  onConfirm,
  onCancel,
  pending,
}: {
  name: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
}) {
  return (
    <div className="mx-auto mt-5 flex max-w-md items-center gap-2">
      <input
        type="text"
        value={name}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Bv. Outreach Q4 2026"
        autoFocus
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onConfirm()
          if (e.key === 'Escape') onCancel()
        }}
        className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
      />
      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        Aanmaken
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
      >
        Annuleer
      </button>
    </div>
  )
}

function FlowMeta({ flow, onDeleted }: { flow: CampaignFlow; onDeleted: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(flow.name)
  const [error, setError] = useState<string | null>(null)

  const dirty = name.trim() !== flow.name

  const handleSave = () => {
    if (!dirty) {
      setEditing(false)
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await updateFlowName(flow.id, name)
      if (result.error) setError(result.error)
      else {
        setEditing(false)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!confirm(`Campagne "${flow.name}" verwijderen? Alle stappen, varianten en uitkomsten gaan verloren.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteFlow(flow.id)
      if (result.error) setError(result.error)
      else onDeleted()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Campagne
          </div>
          {editing ? (
            <div className="mt-1 flex items-center gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={pending}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') {
                    setName(flow.name)
                    setEditing(false)
                  }
                }}
                className="flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-base font-semibold text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm hover:bg-amber-600 disabled:opacity-60"
              >
                Opslaan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="group mt-1 flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-indigo-600"
            >
              {flow.name}
              <svg className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          Verwijder campagne
        </button>
      </div>
      {error && (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
    </section>
  )
}
