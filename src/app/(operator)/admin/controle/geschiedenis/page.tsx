import Link from 'next/link'
import { getCheckHistorySummary } from '@/lib/data/controle'

export const dynamic = 'force-dynamic'

function formatRelative(dateStr: string | null): { text: string; tone: 'never' | 'old' | 'recent' } {
  if (!dateStr) return { text: 'Geen controle in 5 dagen', tone: 'never' }
  const date = new Date(dateStr)
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return { text: 'Vandaag', tone: 'recent' }
  if (diffDays === 1) return { text: 'Gisteren', tone: 'recent' }
  if (diffDays < 5) return { text: `${diffDays}d geleden`, tone: 'recent' }
  return {
    text: date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
    tone: 'old',
  }
}

export default async function GeschiedenisPage() {
  const summary = await getCheckHistorySummary()

  const withChecks = summary.filter((s) => s.totalChecksLast5Days > 0)
  const withoutChecks = summary.filter((s) => s.totalChecksLast5Days === 0)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/controle"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug naar Controle
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
          Controle geschiedenis
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Klik op een klant om de antwoorden van de controles van de afgelopen 5 dagen te bekijken.
        </p>
      </div>

      {withChecks.length === 0 && withoutChecks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {withChecks.length > 0 && (
            <Section
              title="Met controles in de afgelopen 5 dagen"
              count={withChecks.length}
              items={withChecks}
            />
          )}
          {withoutChecks.length > 0 && (
            <Section
              title="Zonder controles in de afgelopen 5 dagen"
              count={withoutChecks.length}
              items={withoutChecks}
              muted
            />
          )}
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  count,
  items,
  muted = false,
}: {
  title: string
  count: number
  items: Awaited<ReturnType<typeof getCheckHistorySummary>>
  muted?: boolean
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        <span className="text-[11px] text-gray-400">{count}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <ClientCard key={item.clientId} item={item} muted={muted} />
        ))}
      </div>
    </div>
  )
}

function ClientCard({
  item,
  muted,
}: {
  item: Awaited<ReturnType<typeof getCheckHistorySummary>>[number]
  muted: boolean
}) {
  const last = formatRelative(item.lastCheckedAt)
  const accent = item.primaryColor ?? '#0ea5e9'

  const initials = item.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  const toneClasses = {
    never: 'bg-gray-100 text-gray-500',
    old: 'bg-amber-100 text-amber-700',
    recent: 'bg-emerald-100 text-emerald-700',
  }[last.tone]

  return (
    <Link
      href={`/admin/controle/geschiedenis/${item.clientId}`}
      className={`group relative isolate overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        muted ? 'border-gray-200 opacity-80 hover:opacity-100' : 'border-gray-200 hover:border-cyan-300'
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-70"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55 60%, transparent)` }}
      />
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white text-xs font-bold text-white shadow-sm"
            style={item.logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
          >
            {item.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.logoUrl} alt={item.companyName} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="drop-shadow">{initials}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{item.companyName}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${toneClasses}`}>
                {last.text}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-100">
                {item.totalChecksLast5Days} {item.totalChecksLast5Days === 1 ? 'controle' : 'controles'}
              </span>
            </div>
          </div>
          <svg className="h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-cyan-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
      <p className="text-sm text-gray-500">Geen klanten gevonden.</p>
    </div>
  )
}
