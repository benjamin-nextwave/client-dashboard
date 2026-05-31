'use client'

interface HistoryItem {
  id: string
  name: string
  color: string | null
  logo: string | null
  pickedAt: string
}

interface Props {
  history: HistoryItem[]
  totalCount: number
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'zojuist'
  if (diffMin < 60) return `${diffMin} min geleden`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} u geleden`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay} d geleden`
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

export function HistorySidebar({ history, totalCount }: Props) {
  const completed = history.length

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-sm">
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          Al geweest
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">{completed}</span>
          <span className="text-xs text-white/40">/ {totalCount}</span>
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-500 transition-all"
              style={{ width: `${(completed / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-xs text-white/40">
          Nog niemand gekozen.
          <br />
          Draai het rad om te starten!
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {history.map((item) => {
            const bg = item.color ?? '#6366f1'
            return (
              <li
                key={item.id}
                className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-2.5 transition-colors hover:border-white/15 hover:bg-white/10"
              >
                <div
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg text-[11px] font-bold text-white shadow"
                  style={
                    item.logo
                      ? { background: '#fff' }
                      : { background: `linear-gradient(135deg, ${bg}, ${bg}aa)` }
                  }
                >
                  {item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logo} alt={item.name} className="h-full w-full object-contain p-0.5" />
                  ) : (
                    initials(item.name)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{item.name}</div>
                  <div className="text-[11px] text-white/50">{formatRelative(item.pickedAt)}</div>
                </div>
                <svg className="h-4 w-4 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}
