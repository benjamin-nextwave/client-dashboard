import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  clientId: string
}

function formatDate(iso: string): string {
  // iso is a DATE column → "YYYY-MM-DD" without time. Anchor at midnight to
  // avoid the locale formatter showing the previous day in negative-offset
  // timezones.
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function daysUntil(iso: string): number {
  const target = new Date(iso + 'T00:00:00').getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((target - today.getTime()) / (24 * 60 * 60 * 1000))
}

/**
 * Big "Datum van livegang" hero block on the client's home page. Only
 * renders when the operator has set a `go_live_date` for this client.
 * The optional explanation note shows below the date when present.
 */
export async function GoLiveBlock({ clientId }: Props) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('go_live_date, go_live_note')
    .eq('id', clientId)
    .single()

  const goLiveDate = data?.go_live_date as string | null
  const goLiveNote = data?.go_live_note as string | null

  if (!goLiveDate) return null

  const days = daysUntil(goLiveDate)
  const inFuture = days > 0
  const isToday = days === 0
  const inPast = days < 0

  const countdownLabel = isToday
    ? 'Vandaag'
    : inFuture
      ? days === 1
        ? 'Nog 1 dag'
        : `Nog ${days} dagen`
      : days === -1
        ? '1 dag geleden'
        : `${Math.abs(days)} dagen geleden`

  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-md">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-300/40 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-300/30 to-transparent blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
            Datum van livegang
          </div>
          <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {formatDate(goLiveDate)}
          </h2>
          {goLiveNote && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
              {goLiveNote}
            </p>
          )}
        </div>

        <div
          className={`relative flex flex-col items-center justify-center rounded-2xl px-5 py-4 text-center shadow-sm ${
            isToday
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : inPast
                ? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'
                : 'bg-white text-indigo-700 ring-1 ring-indigo-200'
          }`}
        >
          <div className="text-3xl font-bold tracking-tight">
            {isToday ? '🚀' : inPast ? '✓' : days}
          </div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide">
            {countdownLabel}
          </div>
        </div>
      </div>
    </section>
  )
}
