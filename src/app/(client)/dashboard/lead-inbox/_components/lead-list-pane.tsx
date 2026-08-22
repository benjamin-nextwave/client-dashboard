'use client'

import Link from 'next/link'
import { useSearchParams, useSelectedLayoutSegment } from 'next/navigation'
import { useMemo } from 'react'
import type { LeadWithStatus, LeadClassification } from '../_lib/types'
import { CLASSIFICATION_DOT, CLASSIFICATION_LABEL } from '../_lib/labels'
import { unescapeLiteralNewlines } from '../_lib/text'

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (now.getTime() - date.getTime() < sevenDays) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  }
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

/** Verwijzingen naar inline afbeeldingen ([cid:...]) uit de leestekst halen. */
export function stripCidTokens(text: string): string {
  return text.replace(/\[?cid:[^\]\s>"']+\]?/gi, ' ')
}

function snippetFromLead(lead: LeadWithStatus): string {
  // Toon altijd snippet van laatste klant-reply (= meest recente inbound).
  const inbound = [...lead.replies]
    .filter((r) => r.direction !== 'outbound')
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
  const last = inbound[0]
  if (!last?.body) return ''
  const cleaned = stripCidTokens(unescapeLiteralNewlines(last.body))
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.length > 140 ? `${cleaned.slice(0, 140)}…` : cleaned
}

/**
 * Bedrijfsnaam afgeleid uit het e-maildomein. Puur cosmetisch: er is geen
 * bedrijfsveld op een lead, en gratis providers zeggen niets over een bedrijf.
 */
const FREE_PROVIDERS = new Set([
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.nl',
  'live.com', 'icloud.com', 'me.com', 'yahoo.com', 'ziggo.nl', 'kpnmail.nl',
  'planet.nl', 'home.nl', 'upcmail.nl', 'proton.me', 'protonmail.com',
])

function companyFromEmail(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || FREE_PROVIDERS.has(domain)) return null
  const base = domain.split('.')[0]
  if (!base) return null
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export function LeadListPane({
  leads,
  search = '',
}: {
  leads: LeadWithStatus[]
  search?: string
}) {
  const params = useSearchParams()
  const activeFilter = params.get('classification') as LeadClassification | null
  const isTrash = params.get('view') === 'trash'
  const selectedSegment = useSelectedLayoutSegment()

  const filtered = useMemo(() => {
    let base: LeadWithStatus[]
    if (isTrash) {
      base = leads.filter((l) => !!l.deleted_at)
    } else {
      const active = leads.filter((l) => !l.deleted_at)
      base = activeFilter
        ? active.filter(
            (l) => l.classification === activeFilter && !l.awaitingOurReply
          )
        : active.filter((l) => l.awaitingOurReply)
    }
    const term = search.trim().toLowerCase()
    if (term) {
      base = base.filter((l) => {
        const haystack = [
          l.name ?? '',
          l.email,
          companyFromEmail(l.email) ?? '',
          snippetFromLead(l),
          ...l.labels.map((label) => label.name),
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(term)
      })
    }

    return [...base].sort(
      (a, b) =>
        new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime()
    )
  }, [leads, activeFilter, isTrash, search])

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
        <div>
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
            {search.trim() ? 'Niets gevonden' : 'Geen leads'}
          </h3>
          <p className="mt-1.5 text-[12.5px] text-muted">
            {search.trim()
              ? `Geen leads die passen bij "${search.trim()}".`
              : isTrash
              ? 'De prullenbak is leeg.'
              : activeFilter
                ? `Geen beantwoorde leads in "${CLASSIFICATION_LABEL[activeFilter]}".`
                : 'Geen leads die op antwoord wachten. Mooi opgeruimd.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
      {filtered.map((lead) => {
        const isSelected = selectedSegment === lead.id
        const qs = isTrash
          ? '?view=trash'
          : activeFilter
            ? `?classification=${activeFilter}`
            : ''
        const href = `/dashboard/lead-inbox/${lead.id}${qs}`
        const company = companyFromEmail(lead.email)
        return (
          <li key={lead.id}>
            <Link
              href={href}
              className={[
                'block border-l-2 px-4 py-3.5 transition-colors',
                isSelected
                  ? 'border-[var(--color-brand)] bg-[var(--brand-08)]'
                  : 'border-transparent hover:bg-[var(--brand-05)]',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p
                  className={`flex min-w-0 items-center gap-1.5 truncate text-[13px] ${
                    lead.awaitingOurReply ? 'font-semibold' : 'font-medium'
                  }`}
                >
                  {lead.hasReferral && (
                    <span
                      title="Doorverwijzing: contactgegevens beschikbaar"
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-neg ring-2 ring-[color-mix(in_oklab,var(--c-neg)_18%,transparent)]"
                    />
                  )}
                  <span className="truncate">{lead.name || lead.email}</span>
                </p>
                <span className="shrink-0 text-[11px] tabular-nums text-faint">
                  {formatRelative(lead.last_reply_at)}
                </span>
              </div>
              {company && (
                <p className="mt-0.5 truncate text-[11.5px] text-faint">{company}</p>
              )}
              <p className="mt-1.5 line-clamp-2 text-xs leading-[1.45] text-muted">
                {snippetFromLead(lead)}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-[5px] bg-track px-2 py-0.5 text-[10.5px] font-medium">
                  <span
                    className="h-[5px] w-[5px] shrink-0 rounded-full"
                    style={{ background: CLASSIFICATION_DOT[lead.classification] }}
                    aria-hidden
                  />
                  {CLASSIFICATION_LABEL[lead.classification]}
                </span>
                {lead.labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 rounded-[5px] bg-track px-2 py-0.5 text-[10.5px] font-medium text-muted"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                      aria-hidden
                    />
                    {label.name}
                  </span>
                ))}
                {lead.labels.length > 3 && (
                  <span className="text-[10.5px] text-faint">
                    +{lead.labels.length - 3}
                  </span>
                )}
                {lead.noteCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[10.5px] text-faint"
                    title={`${lead.noteCount} notitie${lead.noteCount === 1 ? '' : 's'}`}
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                      />
                    </svg>
                    {lead.noteCount}
                  </span>
                )}
                {lead.pendingOutboundCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-[5px] bg-[var(--brand-12)] px-2 py-0.5 text-[10.5px] font-medium text-brand-ink">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                    Wordt verzonden
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
