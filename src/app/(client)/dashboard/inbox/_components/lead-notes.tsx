'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getLabels,
  createLabel,
  deleteLabel,
  getNotesForLead,
  createNote,
  updateNote,
  deleteNote,
} from '@/lib/actions/note-actions'

// ── Color palette (includes neutral tones) ──────────────────────────

const LABEL_COLORS = [
  { name: 'Grijs',      value: '#6b7280' },
  { name: 'Steengrijs', value: '#9ca3af' },
  { name: 'Warmgrijs',  value: '#78716c' },
  { name: 'Blauw',      value: '#3b82f6' },
  { name: 'Indigo',     value: '#6366f1' },
  { name: 'Paars',      value: '#8b5cf6' },
  { name: 'Roze',       value: '#ec4899' },
  { name: 'Rood',       value: '#ef4444' },
  { name: 'Oranje',     value: '#f97316' },
  { name: 'Geel',       value: '#eab308' },
  { name: 'Groen',      value: '#22c55e' },
  { name: 'Cyaan',      value: '#06b6d4' },
]

interface Label {
  id: string
  name: string
  color: string
}

interface Note {
  id: string
  content: string
  label_id: string | null
  created_at: string
  updated_at: string
}

export function LeadNotes({ leadId }: { leadId: string }) {
  const [labels, setLabels] = useState<Label[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  // New note form
  const [isAdding, setIsAdding] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Label management
  const [showLabelPicker, setShowLabelPicker] = useState(false)
  const [showNewLabel, setShowNewLabel] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value)
  const [creatingLabel, setCreatingLabel] = useState(false)

  // Edit mode
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editLabelId, setEditLabelId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [labelsData, notesData] = await Promise.all([
      getLabels(),
      getNotesForLead(leadId),
    ])
    setLabels(labelsData)
    setNotes(notesData)
    setLoading(false)
  }, [leadId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return
    setSaving(true)
    const result = await createNote(leadId, noteContent, selectedLabelId)
    if ('success' in result) {
      setNoteContent('')
      setSelectedLabelId(null)
      setIsAdding(false)
      await loadData()
    }
    setSaving(false)
  }

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim()) return
    setSaving(true)
    const result = await updateNote(noteId, editContent, editLabelId)
    if ('success' in result) {
      setEditingNoteId(null)
      await loadData()
    }
    setSaving(false)
  }

  const handleDeleteNote = async (noteId: string) => {
    await deleteNote(noteId, leadId)
    await loadData()
  }

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return
    setCreatingLabel(true)
    const result = await createLabel(newLabelName, newLabelColor)
    if ('success' in result) {
      setNewLabelName('')
      setNewLabelColor(LABEL_COLORS[0].value)
      setShowNewLabel(false)
      await loadData()
    }
    setCreatingLabel(false)
  }

  const handleDeleteLabel = async (labelId: string) => {
    await deleteLabel(labelId)
    // Clear selection if deleted label was selected
    if (selectedLabelId === labelId) setSelectedLabelId(null)
    if (editLabelId === labelId) setEditLabelId(null)
    await loadData()
  }

  const getLabelById = (id: string | null) => labels.find((l) => l.id === id)

  const selectedLabel = getLabelById(selectedLabelId)

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-24 rounded bg-gray-200" />
          <div className="h-20 rounded bg-gray-100" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notities</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + Toevoegen
          </button>
        )}
      </div>

      {/* ── Add note form ─────────────────────────────────────── */}
      {isAdding && (
        <div className="mb-4 rounded-lg border border-gray-200 p-3">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Schrijf een notitie..."
            rows={3}
            className="w-full resize-none rounded border-0 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0"
          />

          {/* Label selector */}
          <div className="mt-2 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
              >
                {selectedLabel ? (
                  <>
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: selectedLabel.color }}
                    />
                    {selectedLabel.name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLabelId(null)
                      }}
                      className="ml-0.5 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                    </svg>
                    Label
                  </>
                )}
              </button>

              {/* Label picker dropdown */}
              {showLabelPicker && (
                <LabelPickerDropdown
                  labels={labels}
                  selectedId={selectedLabelId}
                  onSelect={(id) => {
                    setSelectedLabelId(id)
                    setShowLabelPicker(false)
                  }}
                  onDelete={handleDeleteLabel}
                  showNewLabel={showNewLabel}
                  setShowNewLabel={setShowNewLabel}
                  newLabelName={newLabelName}
                  setNewLabelName={setNewLabelName}
                  newLabelColor={newLabelColor}
                  setNewLabelColor={setNewLabelColor}
                  onCreateLabel={handleCreateLabel}
                  creatingLabel={creatingLabel}
                  onClose={() => setShowLabelPicker(false)}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => {
                setIsAdding(false)
                setNoteContent('')
                setSelectedLabelId(null)
              }}
              className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
            >
              Annuleren
            </button>
            <button
              onClick={handleSaveNote}
              disabled={saving || !noteContent.trim()}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      )}

      {/* ── Notes list ────────────────────────────────────────── */}
      {notes.length === 0 && !isAdding ? (
        <p className="text-sm text-gray-400">Nog geen notities.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const noteLabel = getLabelById(note.label_id)
            const isEditing = editingNoteId === note.id

            if (isEditing) {
              return (
                <div
                  key={note.id}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded border-0 bg-transparent text-sm text-gray-900 focus:outline-none focus:ring-0"
                  />
                  <div className="mt-2">
                    <EditLabelSelector
                      labels={labels}
                      editLabelId={editLabelId}
                      setEditLabelId={setEditLabelId}
                      onDeleteLabel={handleDeleteLabel}
                      onCreateLabel={handleCreateLabel}
                      showNewLabel={showNewLabel}
                      setShowNewLabel={setShowNewLabel}
                      newLabelName={newLabelName}
                      setNewLabelName={setNewLabelName}
                      newLabelColor={newLabelColor}
                      setNewLabelColor={setNewLabelColor}
                      creatingLabel={creatingLabel}
                    />
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => setEditingNoteId(null)}
                      className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={saving || !editContent.trim()}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Opslaan...' : 'Opslaan'}
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={note.id}
                className="group rounded-lg border p-3"
                style={{
                  borderColor: noteLabel ? noteLabel.color + '40' : '#e5e7eb',
                  backgroundColor: noteLabel ? noteLabel.color + '08' : undefined,
                }}
              >
                {noteLabel && (
                  <span
                    className="mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: noteLabel.color }}
                  >
                    {noteLabel.name}
                  </span>
                )}
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {note.content}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    {new Date(note.created_at).toLocaleDateString('nl-NL', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditingNoteId(note.id)
                        setEditContent(note.content)
                        setEditLabelId(note.label_id)
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="Bewerken"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Verwijderen"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Label picker dropdown (shared logic) ────────────────────────────

function LabelPickerDropdown({
  labels,
  selectedId,
  onSelect,
  onDelete,
  showNewLabel,
  setShowNewLabel,
  newLabelName,
  setNewLabelName,
  newLabelColor,
  setNewLabelColor,
  onCreateLabel,
  creatingLabel,
  onClose,
}: {
  labels: Label[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  showNewLabel: boolean
  setShowNewLabel: (v: boolean) => void
  newLabelName: string
  setNewLabelName: (v: string) => void
  newLabelColor: string
  setNewLabelColor: (v: string) => void
  onCreateLabel: () => void
  creatingLabel: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
        {labels.length > 0 && (
          <div className="max-h-48 overflow-y-auto">
            {labels.map((label) => (
              <div
                key={label.id}
                className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50"
              >
                <button
                  onClick={() => onSelect(label.id)}
                  className="flex flex-1 items-center gap-2 text-left text-xs text-gray-700"
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className={selectedId === label.id ? 'font-semibold' : ''}>
                    {label.name}
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(label.id)
                  }}
                  className="ml-2 rounded p-0.5 text-gray-300 hover:text-red-500"
                  title="Label verwijderen"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {labels.length > 0 && <div className="my-1 border-t border-gray-100" />}

        {!showNewLabel ? (
          <button
            onClick={() => setShowNewLabel(true)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-blue-600 hover:bg-blue-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nieuw label
          </button>
        ) : (
          <div className="px-3 py-2">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="Labelnaam (1-3 woorden)"
              maxLength={30}
              className="w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 focus:border-blue-400 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCreateLabel()
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewLabelColor(c.value)}
                  className="h-5 w-5 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor: newLabelColor === c.value ? '#1d4ed8' : 'transparent',
                  }}
                  title={c.name}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-end gap-1">
              <button
                onClick={() => {
                  setShowNewLabel(false)
                  setNewLabelName('')
                }}
                className="rounded px-2 py-1 text-[10px] text-gray-500 hover:bg-gray-100"
              >
                Annuleren
              </button>
              <button
                onClick={onCreateLabel}
                disabled={creatingLabel || !newLabelName.trim()}
                className="rounded bg-blue-600 px-2 py-1 text-[10px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingLabel ? '...' : 'Aanmaken'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Edit label selector (reuses dropdown) ───────────────────────────

function EditLabelSelector({
  labels,
  editLabelId,
  setEditLabelId,
  onDeleteLabel,
  onCreateLabel,
  showNewLabel,
  setShowNewLabel,
  newLabelName,
  setNewLabelName,
  newLabelColor,
  setNewLabelColor,
  creatingLabel,
}: {
  labels: Label[]
  editLabelId: string | null
  setEditLabelId: (id: string | null) => void
  onDeleteLabel: (id: string) => void
  onCreateLabel: () => void
  showNewLabel: boolean
  setShowNewLabel: (v: boolean) => void
  newLabelName: string
  setNewLabelName: (v: string) => void
  newLabelColor: string
  setNewLabelColor: (v: string) => void
  creatingLabel: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = labels.find((l) => l.id === editLabelId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
      >
        {label ? (
          <>
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditLabelId(null)
              }}
              className="ml-0.5 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Label
          </>
        )}
      </button>

      {open && (
        <LabelPickerDropdown
          labels={labels}
          selectedId={editLabelId}
          onSelect={(id) => {
            setEditLabelId(id)
            setOpen(false)
          }}
          onDelete={onDeleteLabel}
          showNewLabel={showNewLabel}
          setShowNewLabel={setShowNewLabel}
          newLabelName={newLabelName}
          setNewLabelName={setNewLabelName}
          newLabelColor={newLabelColor}
          setNewLabelColor={setNewLabelColor}
          onCreateLabel={onCreateLabel}
          creatingLabel={creatingLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
