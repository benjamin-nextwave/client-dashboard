'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { InboxFolder } from '@/lib/data/inbox-data'
import { createFolder, updateFolder, deleteFolder } from '@/lib/actions/inbox-actions'

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  folder?: InboxFolder | null
}

export function FolderModal({ isOpen, onClose, folder }: FolderModalProps) {
  const [name, setName] = useState(folder?.name ?? '')
  const [color, setColor] = useState(folder?.color ?? PRESET_COLORS[0])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const router = useRouter()

  const isEditing = !!folder

  function handleSave() {
    if (!name.trim()) {
      setError('Vul een naam in.')
      return
    }
    setError('')
    startTransition(async () => {
      const result = isEditing
        ? await updateFolder(folder.id, name, color)
        : await createFolder(name, color)

      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteFolder(folder!.id)
      if ('error' in result) {
        setError(result.error)
      } else {
        router.refresh()
        onClose()
      }
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEditing ? 'Map bewerken' : 'Nieuwe map aanmaken'}
        </h2>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Naam</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder="Bijv. Interesse, Warm, Follow-up..."
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            maxLength={20}
          />
          <p className="mt-1 text-xs text-gray-400">{name.length}/20</p>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Kleur</label>
          <div className="mt-2 flex gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        {showDeleteConfirm ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-800">
              Leads in deze map worden teruggeplaatst naar Inbox.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Verwijderen
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-between">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Verwijderen
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Opslaan...' : isEditing ? 'Opslaan' : 'Aanmaken'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
