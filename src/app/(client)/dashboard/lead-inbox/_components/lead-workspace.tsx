'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  assignLabel,
  createLabel,
  createNote,
  deleteLabel,
  deleteNote,
  moveLeadToTrash,
  permanentlyDeleteLead,
  restoreLeadFromTrash,
  unassignLabel,
  updateNote,
} from '../_lib/actions'
import { COLOR_PALETTE, DEFAULT_COLOR } from '../_lib/palette'
import type { LeadNote, UserLabel } from '../_lib/types'
import { ColorSwatches } from './color-swatches'
import { ReplyForm } from './reply-form'

type Panel = 'reply' | 'note' | 'label' | null

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LeadWorkspace({
  leadId,
  isTrashed,
  canReply,
  replyToSubject,
  sendingAccount,
  toEmail,
  signature,
  assignedLabels,
  availableLabels,
  notes,
}: {
  leadId: string
  isTrashed: boolean
  canReply: boolean
  replyToSubject: string
  sendingAccount: string
  toEmail: string
  signature: string | null
  assignedLabels: UserLabel[]
  availableLabels: UserLabel[]
  notes: LeadNote[]
}) {
  const [panel, setPanel] = useState<Panel>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function toggle(p: Exclude<Panel, null>) {
    setPanel((cur) => (cur === p ? null : p))
    setEditingNoteId(null)
    setError(null)
  }

  function close() {
    setPanel(null)
    setEditingNoteId(null)
  }

  function handleTrash() {
    setError(null)
    startTransition(async () => {
      const res = await moveLeadToTrash(leadId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push('/dashboard/lead-inbox')
    })
  }

  function handleRestore() {
    setError(null)
    startTransition(async () => {
      const res = await restoreLeadFromTrash(leadId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push('/dashboard/lead-inbox')
    })
  }

  function handlePermanent() {
    if (!confirm('Lead definitief verwijderen? Dit kan niet ongedaan gemaakt worden.')) return
    setError(null)
    startTransition(async () => {
      const res = await permanentlyDeleteLead(leadId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push('/dashboard/lead-inbox?view=trash')
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        {isTrashed ? (
          <>
            <ToolbarButton onClick={handleRestore} disabled={pending} icon={<IconRestore />}>
              Herstellen
            </ToolbarButton>
            <ToolbarButton onClick={handlePermanent} disabled={pending} variant="danger" icon={<IconTrash />}>
              Definitief verwijderen
            </ToolbarButton>
          </>
        ) : (
          <ToolbarButton onClick={handleTrash} disabled={pending} icon={<IconTrash />}>
            Naar prullenbak
          </ToolbarButton>
        )}
        <ToolbarButton
          onClick={() => toggle('label')}
          disabled={pending}
          active={panel === 'label'}
          icon={<IconPlus />}
        >
          Label
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggle('note')}
          disabled={pending}
          active={panel === 'note'}
          icon={<IconNote />}
        >
          Notitie toevoegen
        </ToolbarButton>
        {canReply && !isTrashed && (
          <ToolbarButton
            onClick={() => toggle('reply')}
            disabled={pending}
            active={panel === 'reply'}
            variant="primary"
            icon={<IconReply />}
          >
            Reageren
          </ToolbarButton>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}

      {/* Active panel */}
      {panel === 'reply' && canReply && !isTrashed && (
        <div className="mt-3">
          <ReplyForm
            leadId={leadId}
            replyToSubject={replyToSubject}
            sendingAccount={sendingAccount}
            toEmail={toEmail}
            signature={signature}
            onSent={close}
            onCancel={close}
          />
        </div>
      )}
      {panel === 'note' && (
        <div className="mt-3">
          <NoteEditor leadId={leadId} onDone={close} />
        </div>
      )}
      {panel === 'label' && (
        <div className="mt-3">
          <LabelPicker
            leadId={leadId}
            assigned={assignedLabels}
            available={availableLabels}
          />
        </div>
      )}

      {/* Altijd zichtbaar: toegewezen labels + notes-lijst */}
      {assignedLabels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {assignedLabels.map((label) => (
            <AssignedLabelChip key={label.id} leadId={leadId} label={label} />
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {notes.map((note) =>
            editingNoteId === note.id ? (
              <li key={note.id}>
                <NoteEditor
                  leadId={leadId}
                  note={note}
                  onDone={() => setEditingNoteId(null)}
                />
              </li>
            ) : (
              <NoteListItem
                key={note.id}
                note={note}
                onEdit={() => setEditingNoteId(note.id)}
              />
            )
          )}
        </ul>
      )}
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
  variant = 'default',
  icon,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  active?: boolean
  variant?: 'default' | 'primary' | 'danger'
  icon: React.ReactNode
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const variantClasses =
    variant === 'primary'
      ? 'bg-[var(--color-brand)] text-white hover:opacity-90'
      : variant === 'danger'
        ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
        : `border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 ${active ? 'ring-2 ring-[var(--color-brand)]' : ''}`
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${base} ${variantClasses}`}>
      {icon}
      {children}
    </button>
  )
}

function AssignedLabelChip({ leadId, label }: { leadId: string; label: UserLabel }) {
  const [pending, startTransition] = useTransition()
  function remove() {
    startTransition(async () => {
      await unassignLabel(leadId, label.id)
    })
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: label.color }}
        aria-hidden
      />
      {label.name}
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="rounded-full p-0.5 hover:bg-gray-200 disabled:opacity-50"
        aria-label={`Verwijder label ${label.name}`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  )
}

function LabelPicker({
  leadId,
  assigned,
  available,
}: {
  leadId: string
  assigned: UserLabel[]
  available: UserLabel[]
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const assignedIds = new Set(assigned.map((l) => l.id))

  function toggle(label: UserLabel) {
    setError(null)
    const fn = assignedIds.has(label.id) ? unassignLabel : assignLabel
    startTransition(async () => {
      const res = await fn(leadId, label.id)
      if (!res.ok) setError(res.error)
    })
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createLabel(name, color)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setName('')
      setCreating(false)
    })
  }

  function handleDelete(labelId: string) {
    if (!confirm('Label definitief verwijderen? Alle koppelingen verdwijnen ook.')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteLabel(labelId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        Labels toewijzen
      </p>
      <div className="flex flex-wrap gap-1.5">
        {available.length === 0 && (
          <p className="text-xs text-gray-500">Nog geen labels aangemaakt.</p>
        )}
        {available.map((label) => {
          const isAssigned = assignedIds.has(label.id)
          return (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white py-0.5 pl-2 pr-1"
            >
              <button
                type="button"
                onClick={() => toggle(label)}
                disabled={pending}
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${isAssigned ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'} disabled:opacity-50`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: label.color }}
                  aria-hidden
                />
                {label.name}
                {isAssigned && (
                  <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(label.id)}
                disabled={pending}
                className="rounded-full p-0.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                title="Label definitief verwijderen"
                aria-label={`Verwijder label ${label.name}`}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )
        })}
      </div>

      {creating ? (
        <form onSubmit={handleCreate} className="mt-3 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            placeholder="Label-naam"
            className="block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-gray-400 disabled:opacity-60"
          />
          <ColorSwatches value={color} onChange={setColor} size="sm" />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCreating(false)}
              disabled={pending}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Aanmaken
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuw label
        </button>
      )}
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  )
}

function NoteEditor({
  leadId,
  note,
  onDone,
}: {
  leadId: string
  note?: LeadNote
  onDone: () => void
}) {
  const [body, setBody] = useState(note?.body ?? '')
  const [color, setColor] = useState<string>(note?.color ?? DEFAULT_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = note
        ? await updateNote(note.id, body, color)
        : await createNote(leadId, body, color)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={pending}
        rows={3}
        placeholder="Notitie schrijven…"
        className="block w-full resize-y rounded-md border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 disabled:opacity-60"
      />
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
        <ColorSwatches value={color} onChange={setColor} size="sm" />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            disabled={pending}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {note ? 'Opslaan' : 'Toevoegen'}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </form>
  )
}

function NoteListItem({ note, onEdit }: { note: LeadNote; onEdit: () => void }) {
  const [pending, startTransition] = useTransition()
  function handleDelete() {
    if (!confirm('Notitie verwijderen?')) return
    startTransition(async () => {
      await deleteNote(note.id)
    })
  }
  return (
    <li
      className="rounded-lg border border-l-4 bg-white p-3 shadow-sm"
      style={{ borderLeftColor: note.color, borderColor: '#e5e7eb' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{note.body}</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Bewerken"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-md p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
            aria-label="Verwijderen"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-gray-400">
        {formatDateTime(note.updated_at)}
      </p>
    </li>
  )
}

function IconTrash() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
    </svg>
  )
}

function IconRestore() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}

function IconNote() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
    </svg>
  )
}

function IconReply() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25" />
    </svg>
  )
}
