'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  updateClientDealbasis,
  updateClientInboxApproach,
  updateClientStartDateMaand,
  updateClientEndDateMaand,
} from '../overview-actions'

interface Props {
  clientId: string
  accent: string
  email: string
  password: string | null
  dealbasis: string | null
  inboxApproach: string | null
  startDateMaand: string | null
  endDateMaand: string | null
  hasFormSubmission: boolean
}

const INBOX_APPROACH_LABELS: Record<string, string> = {
  eigen_workspace: 'Eigen workspace',
  n8n_inbox: 'n8n inbox',
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ClientOverviewBubbles({
  clientId,
  email,
  password,
  dealbasis,
  inboxApproach,
  startDateMaand,
  endDateMaand,
  hasFormSubmission,
}: Props) {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <DealbasisBubble clientId={clientId} value={dealbasis} />
      <CopyBubble
        label="E-mail"
        value={email || null}
        emptyLabel="Geen e-mailadres"
        tint="from-blue-50 to-sky-50 border-blue-200/60"
        iconColor="text-blue-600 bg-blue-100"
        icon={
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        }
      />
      <PasswordBubble password={password} />
      <InboxApproachBubble clientId={clientId} value={inboxApproach} />
      <DateBubble
        clientId={clientId}
        label="Startdatum maand"
        value={startDateMaand}
        tint="from-emerald-50 to-teal-50 border-emerald-200/60"
        iconColor="text-emerald-600 bg-emerald-100"
        kind="start"
      />
      <DateBubble
        clientId={clientId}
        label="Einddatum maand"
        value={endDateMaand}
        tint="from-rose-50 to-orange-50 border-rose-200/60"
        iconColor="text-rose-600 bg-rose-100"
        kind="end"
      />
      <FormButtonBubble clientId={clientId} hasFormSubmission={hasFormSubmission} />
    </section>
  )
}

function BubbleShell({
  tint,
  iconColor,
  icon,
  label,
  children,
}: {
  tint: string
  iconColor: string
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tint} p-4 shadow-sm transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconColor}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function DealbasisBubble({ clientId, value }: { clientId: string; value: string | null }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value ?? '')
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      await updateClientDealbasis(clientId, text)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <BubbleShell
      tint="from-amber-50 to-yellow-50 border-amber-200/60"
      iconColor="text-amber-700 bg-amber-100"
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
        </svg>
      }
      label="Dealbasis"
    >
      {editing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bijv. Performance € 950 + setup"
            className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-3 py-1 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
            <button
              type="button"
              onClick={() => { setText(value ?? ''); setEditing(false) }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full truncate text-left text-sm font-medium text-gray-900 hover:text-amber-700"
          title={value ?? 'Klik om in te vullen'}
        >
          {value ?? <span className="italic text-gray-400">Klik om in te vullen</span>}
        </button>
      )}
    </BubbleShell>
  )
}

function CopyBubble({
  label,
  value,
  emptyLabel,
  tint,
  iconColor,
  icon,
}: {
  label: string
  value: string | null
  emptyLabel: string
  tint: string
  iconColor: string
  icon: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <BubbleShell tint={tint} iconColor={iconColor} icon={icon} label={label}>
      {value ? (
        <button
          type="button"
          onClick={copy}
          className="group/cb flex w-full items-center justify-between gap-2 text-left"
        >
          <span className="truncate text-sm font-medium text-gray-900">{value}</span>
          <span className={`text-[10px] font-semibold ${copied ? 'text-emerald-600' : 'text-gray-400 opacity-0 group-hover/cb:opacity-100'}`}>
            {copied ? 'Gekopieerd' : 'Kopieer'}
          </span>
        </button>
      ) : (
        <span className="text-sm italic text-gray-400">{emptyLabel}</span>
      )}
    </BubbleShell>
  )
}

function PasswordBubble({ password }: { password: string | null }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <BubbleShell
      tint="from-indigo-50 to-violet-50 border-indigo-200/60"
      iconColor="text-indigo-600 bg-indigo-100"
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      }
      label="Wachtwoord"
    >
      {password ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-sm text-gray-900">
            {revealed ? password : '••••••••'}
          </span>
          <div className="flex gap-1.5 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="text-indigo-600 hover:text-indigo-800"
            >
              {revealed ? 'Verberg' : 'Toon'}
            </button>
            <span className="text-gray-300">·</span>
            <button
              type="button"
              onClick={copy}
              className={copied ? 'text-emerald-600' : 'text-indigo-600 hover:text-indigo-800'}
            >
              {copied ? 'Gekopieerd' : 'Kopieer'}
            </button>
          </div>
        </div>
      ) : (
        <span className="text-sm italic text-gray-400">Geen wachtwoord opgeslagen</span>
      )}
    </BubbleShell>
  )
}

function InboxApproachBubble({ clientId, value }: { clientId: string; value: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const setApproach = (next: string | null) => {
    startTransition(async () => {
      await updateClientInboxApproach(clientId, next)
      router.refresh()
    })
  }

  return (
    <BubbleShell
      tint="from-fuchsia-50 to-pink-50 border-fuchsia-200/60"
      iconColor="text-fuchsia-600 bg-fuchsia-100"
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
        </svg>
      }
      label="Inbox aanpak"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={value ?? ''}
          onChange={(e) => setApproach(e.target.value === '' ? null : e.target.value)}
          disabled={pending}
          className="rounded-lg border border-fuchsia-200 bg-white px-2 py-1 text-xs font-semibold text-gray-900 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100 disabled:opacity-60"
        >
          <option value="">— Niet ingesteld —</option>
          <option value="eigen_workspace">Eigen workspace</option>
          <option value="n8n_inbox">n8n inbox</option>
        </select>
        {value && (
          <span className="text-[10px] font-medium text-fuchsia-700">
            {INBOX_APPROACH_LABELS[value]}
          </span>
        )}
      </div>
    </BubbleShell>
  )
}

function DateBubble({
  clientId,
  label,
  value,
  tint,
  iconColor,
  kind,
}: {
  clientId: string
  label: string
  value: string | null
  tint: string
  iconColor: string
  kind: 'start' | 'end'
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(value ?? '')
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const action = kind === 'start' ? updateClientStartDateMaand : updateClientEndDateMaand
      await action(clientId, date || null)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <BubbleShell
      tint={tint}
      iconColor={iconColor}
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      }
      label={label}
    >
      {editing ? (
        <div className="space-y-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
            <button
              type="button"
              onClick={() => { setDate(value ?? ''); setEditing(false) }}
              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    const action = kind === 'start' ? updateClientStartDateMaand : updateClientEndDateMaand
                    await action(clientId, null)
                    setDate('')
                    setEditing(false)
                    router.refresh()
                  })
                }}
                className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
              >
                Wissen
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="block w-full truncate text-left text-sm font-medium text-gray-900 hover:text-indigo-700"
        >
          {value ? formatDate(value) : <span className="italic text-gray-400">Klik om in te vullen</span>}
        </button>
      )}
    </BubbleShell>
  )
}

function FormButtonBubble({ clientId, hasFormSubmission }: { clientId: string; hasFormSubmission: boolean }) {
  return (
    <BubbleShell
      tint="from-cyan-50 to-sky-50 border-cyan-200/60"
      iconColor="text-cyan-600 bg-cyan-100"
      icon={
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      }
      label="Invulformulier"
    >
      {hasFormSubmission ? (
        <Link
          href={`/admin/clients/${clientId}/invulformulier`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-900"
        >
          Bekijk antwoorden
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      ) : (
        <span className="text-sm italic text-gray-400">Nog niet ingevuld</span>
      )}
    </BubbleShell>
  )
}
