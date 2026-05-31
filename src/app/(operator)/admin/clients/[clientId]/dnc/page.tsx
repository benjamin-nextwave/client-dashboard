import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { DncEntriesTable } from './_components/dnc-entries-table'
import { DncSectorsEditor } from './_components/dnc-sectors-editor'
import { DncAdminNote } from './_components/dnc-admin-note'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

interface DncEntryRow {
  id: string
  entry_type: 'email' | 'domain'
  value: string
  approved: boolean
  approved_at: string | null
  created_at: string
}

export default async function AdminClientDncPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, dnc_sectors, dnc_admin_note')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const c = client as unknown as Record<string, unknown>
  const companyName = (c.company_name as string) ?? ''
  const accent = (c.primary_color as string | null) ?? '#6366f1'
  const sectorsRaw = c.dnc_sectors
  const sectors: string[] = Array.isArray(sectorsRaw)
    ? (sectorsRaw.filter((s) => typeof s === 'string') as string[])
    : []
  const adminNote = (c.dnc_admin_note as string | null) ?? null

  let entries: DncEntryRow[] = []
  const { data: entriesData } = await supabase
    .from('dnc_entries')
    .select('id, entry_type, value, approved, approved_at, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (Array.isArray(entriesData)) {
    entries = entriesData as DncEntryRow[]
  }

  const totalEmails = entries.filter((e) => e.entry_type === 'email').length
  const totalDomains = entries.filter((e) => e.entry_type === 'domain').length
  const pending = entries.filter((e) => !e.approved).length

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/admin/clients/${clientId}`}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar klantoverzicht
      </Link>

      <header>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Do Not Contact</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{companyName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Beheer de e-mailadressen en domeinen die de klant heeft ingediend, plus de sectoren en interne notities.
        </p>
      </header>

      {/* Stats + export */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">E-mailadressen</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{totalEmails}</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Domeinen</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{totalDomains}</div>
        </div>
        <div
          className="rounded-2xl border p-4 shadow-sm"
          style={{
            borderColor: pending > 0 ? '#fcd34d' : '#bbf7d0',
            background: pending > 0 ? '#fffbeb' : '#f0fdf4',
          }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">In verwerking</div>
          <div className={`mt-1 text-2xl font-semibold ${pending > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {pending}
          </div>
        </div>
      </section>

      {/* Sectoren */}
      <DncSectorsEditor clientId={clientId} initialSectors={sectors} accent={accent} />

      {/* Admin note */}
      <DncAdminNote clientId={clientId} initialNote={adminNote} />

      {/* Entries lijst */}
      <DncEntriesTable
        clientId={clientId}
        entries={entries.map((e) => ({
          id: e.id,
          entryType: e.entry_type,
          value: e.value,
          approved: e.approved,
          approvedAt: e.approved_at,
          createdAt: e.created_at,
        }))}
      />
    </div>
  )
}
