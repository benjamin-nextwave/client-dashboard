'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientListItem } from '@/lib/data/admin-stats'
import { deleteClient, toggleClientHidden } from '../clients/actions'

type SortKey = 'alphabetical' | 'recent'

interface ClientOverviewListProps {
  clients: ClientListItem[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Vandaag'
  if (days === 1) return 'Gisteren'
  if (days < 7) return `${days}d geleden`
  if (days < 30) return `${Math.floor(days / 7)}w geleden`
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ClientOverviewList({ clients }: ClientOverviewListProps) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('alphabetical')
  const [showPaused, setShowPaused] = useState(false)

  const filtered = useMemo(() => {
    let result = clients
    if (!showPaused) result = result.filter((c) => !c.isHidden)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.companyName.toLowerCase().includes(q))
    }
    const sorted = [...result]
    if (sort === 'alphabetical') {
      sorted.sort((a, b) => a.companyName.localeCompare(b.companyName))
    } else {
      sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }
    return sorted
  }, [clients, search, sort, showPaused])

  const pausedCount = clients.filter((c) => c.isHidden).length

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Zoek een klant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center gap-2">
          {pausedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowPaused((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold transition-all ${
                showPaused
                  ? 'border-gray-900 bg-gray-900 text-white shadow-lg'
                  : 'border-gray-200 bg-white text-gray-700 shadow-sm hover:border-gray-300'
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Gepauzeerd
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${showPaused ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                {pausedCount}
              </span>
            </button>
          )}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-gray-300 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <option value="alphabetical">Alfabetisch</option>
              <option value="recent">Recent bijgewerkt</option>
            </select>
            <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
          <svg className="h-9 w-9 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            Geen klanten gevonden{search ? ` voor "${search}"` : ''}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClientCard({ client }: { client: ClientListItem }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [togglingHidden, setTogglingHidden] = useState(false)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteClient(client.id)
    if (result.error) {
      setDeleteError(result.error)
      setIsDeleting(false)
    } else {
      setShowDeleteDialog(false)
      router.refresh()
    }
  }, [client.id, router])

  const handleToggleHidden = useCallback(async () => {
    setTogglingHidden(true)
    await toggleClientHidden(client.id, !client.isHidden)
    router.refresh()
    setTogglingHidden(false)
  }, [client.id, client.isHidden, router])

  const initials = client.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  const accent = client.primaryColor ?? '#6366f1'

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 ${
        client.isHidden ? 'border-dashed border-gray-200 opacity-75' : 'border-gray-200 hover:border-indigo-200'
      }`}
    >
      {/* Accent gradient bar */}
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-70 transition-opacity group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55 60%, transparent)` }}
      />
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ background: accent }}
      />

      <div className="relative p-6">
        {/* Top: logo + name + menu */}
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white text-sm font-bold text-white shadow-sm transition-transform group-hover:scale-105"
            style={client.logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
          >
            {client.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logoUrl} alt={client.companyName} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="drop-shadow">{initials}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold text-gray-900 transition-colors group-hover:text-indigo-600">
              {client.companyName}
            </h3>
          </div>

          {/* Menu button (z-10 to sit above the link overlay) */}
          <div className="relative z-10 flex-shrink-0">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v) }}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Meer acties"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => { e.preventDefault(); setMenuOpen(false) }}
                />
                <div className="absolute right-0 top-9 z-30 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl ring-1 ring-black/5">
                  <MenuItem href={`/admin/clients/${client.id}/edit`} label="Bewerken" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" /></svg>
                  } />
                  <MenuItem href={`/admin/clients/${client.id}/csv`} label="CSV beheren" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" /></svg>
                  } />
                  <MenuItem href={`/admin/clients/${client.id}/onboarding`} label="Onboarding" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                  } />
                  <MenuItem href={`/admin/clients/${client.id}/voorvertoning`} label="Voorvertoning" icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  } />
                  <div className="h-px bg-gray-100" />
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); handleToggleHidden() }}
                    disabled={togglingHidden}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9v6m-4.5 0V9M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    {client.isHidden ? 'Activeren' : 'Pauzeren'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setShowDeleteDialog(true) }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" /></svg>
                    Verwijderen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Credentials */}
        <div className="relative z-10 mt-3 space-y-2">
          <CopyField
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            }
            value={client.loginEmail}
            emptyLabel="Geen e-mailadres"
            label="E-mail"
          />
          {client.password ? (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPassword(true) }}
              className="group/pw flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-left text-xs transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-400 ring-1 ring-gray-200 group-hover/pw:text-indigo-500">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Wachtwoord</div>
                <div className="truncate font-mono text-xs text-gray-500">••••••••</div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 opacity-0 transition-opacity group-hover/pw:opacity-100">
                Tonen
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-3 py-2 text-xs text-gray-400">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-300 ring-1 ring-gray-200">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </span>
              Geen wachtwoord opgeslagen
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-3 flex items-center gap-3">
          <div className="text-[10px] leading-tight">
            <div className="text-gray-400">Bijgewerkt</div>
            <div className="font-semibold text-gray-700">{formatDate(client.updatedAt)}</div>
          </div>
          <Link
            href={`/admin/clients/${client.id}/edit`}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md hover:shadow-indigo-600/30 group-hover:bg-indigo-600"
          >
            Open klant
            <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {deleteError && (
          <div className="relative z-10 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {deleteError}
          </div>
        )}
      </div>

      {/* Full-card overlay link — painted above inert content, below z-10 interactive elements */}
      <Link
        href={`/admin/clients/${client.id}/edit`}
        aria-label={`Open ${client.companyName}`}
        className="absolute inset-0 z-[5] rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      />

      {showPassword && client.password && (
        <PasswordModal password={client.password} onClose={() => setShowPassword(false)} />
      )}

      {showDeleteDialog && (
        <DeleteConfirmDialog
          clientName={client.companyName}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteDialog(false); setDeleteError(null) }}
          isDeleting={isDeleting}
        />
      )}
    </article>
  )
}

function CopyField({
  icon,
  value,
  label,
  emptyLabel,
}: {
  icon: React.ReactNode
  value: string | null
  label: string
  emptyLabel: string
}) {
  const [copied, setCopied] = useState(false)

  if (!value) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/40 px-3 py-2 text-xs text-gray-400">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-300 ring-1 ring-gray-200">
          {icon}
        </span>
        {emptyLabel}
      </div>
    )
  }

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group/cf flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2 text-left text-xs transition-all hover:border-indigo-200 hover:bg-indigo-50/50"
    >
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white text-gray-400 ring-1 ring-gray-200 group-hover/cf:text-indigo-500">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className="truncate text-gray-700">{value}</div>
      </div>
      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold transition-all ${copied ? 'text-emerald-600' : 'text-indigo-600 opacity-0 group-hover/cf:opacity-100'}`}>
        {copied ? (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Gekopieerd
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
            </svg>
            Kopieer
          </>
        )}
      </span>
    </button>
  )
}

function MenuItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </Link>
  )
}

function PasswordModal({ password, onClose }: { password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">Klant wachtwoord</h3>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-sm text-gray-800 break-all">
          {password}
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            {copied ? 'Gekopieerd!' : 'Kopiëren'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirmDialog({
  clientName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  clientName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  const [confirmText, setConfirmText] = useState('')
  const isMatch = confirmText === clientName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Klant verwijderen</h3>
            <p className="text-sm text-gray-500">Dit kan niet ongedaan worden gemaakt!</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Je staat op het punt om alles te verwijderen van:</p>
          <p className="mt-1 font-bold">{clientName}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            <li>Het complete klantdashboard</li>
            <li>Alle contacten en campagnegegevens</li>
            <li>Het login-account van deze klant</li>
            <li>Alle analytics en synchronisatiedata</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Typ <span className="font-bold text-red-600">{clientName}</span> om te bevestigen:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder={clientName}
            disabled={isDeleting}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Verwijderen...' : 'Definitief verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}
