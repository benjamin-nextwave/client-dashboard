'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { LABEL_META, LEAD_LABELS, type CampaignLead, type LeadLabel, type WeekGroup } from '@/lib/data/campaign-leads'
import { LeadCard } from './lead-card'

interface Props {
  allLeads: CampaignLead[]
  weekGroups: WeekGroup[]
  activeLabel: LeadLabel | null
}

export function LeadsOverview({ allLeads, weekGroups, activeLabel }: Props) {
  // Tellingen per label op basis van álle leads (niet de gefilterde set), zodat
  // de chips altijd het werkelijke totaal per categorie laten zien.
  const counts = useMemo(() => {
    const c: Record<LeadLabel, number> = {
      meeting_voorstel: 0,
      geinteresseerd: 0,
      telefonisch_voorstel: 0,
      komt_erop_terug: 0,
      doorverwezen: 0,
      later_mogelijk: 0,
      geen_interesse: 0,
    }
    for (const l of allLeads) c[l.label] += 1
    return c
  }, [allLeads])

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          href="/dashboard/campagne-leads"
          label={`Alles (${allLeads.length})`}
          active={activeLabel === null}
        />
        {LEAD_LABELS.map((label) => {
          const meta = LABEL_META[label]
          const count = counts[label]
          if (count === 0) return null
          return (
            <FilterChip
              key={label}
              href={`/dashboard/campagne-leads?label=${label}`}
              label={`${meta.short} (${count})`}
              active={activeLabel === label}
              dotClass={meta.dot}
            />
          )
        })}
      </div>

      {weekGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">Geen leads in deze categorie.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {weekGroups.map((group) => (
            <WeekSection key={group.key} group={group} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  href,
  label,
  active,
  dotClass,
}: {
  href: string
  label: string
  active: boolean
  dotClass?: string
}) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'
  const cls = active
    ? `${base} border-gray-900 bg-gray-900 text-white`
    : `${base} border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50`
  return (
    <Link href={href} className={cls}>
      {dotClass && <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-white' : dotClass}`} />}
      {label}
    </Link>
  )
}

function WeekSection({ group }: { group: WeekGroup }) {
  const start = new Date(group.startDate)
  const end = new Date(group.endDate)
  const fmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
  const headerLabel = `Week ${group.weekNumber} · ${fmt.format(start)} – ${fmt.format(end)} ${group.year}`

  return (
    <section>
      <div className="sticky top-0 z-10 mb-3 flex items-center gap-3 bg-[#fafafa]/95 py-2 backdrop-blur">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {headerLabel}
        </h2>
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400">
          {group.leads.length} {group.leads.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>
      <div className="space-y-3">
        {group.leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </section>
  )
}
