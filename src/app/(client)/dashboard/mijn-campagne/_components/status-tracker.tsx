import Link from 'next/link'
import type { CampaignTask } from '@/lib/data/campaign'

interface Props {
  tasks: CampaignTask[]
}

export function StatusTracker({ tasks }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Voortgang</h2>

      {/* Horizontal track */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200" />
        <div
          className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-400 transition-all"
          style={{ width: `${computeProgressWidth(tasks)}%` }}
        />

        <ol className="relative grid gap-4" style={{ gridTemplateColumns: `repeat(${tasks.length}, minmax(0, 1fr))` }}>
          {tasks.map((task, i) => (
            <li key={task.id} className="flex flex-col items-center text-center">
              <div
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  task.status === 'completed'
                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : task.status === 'current'
                      ? 'border-indigo-500 bg-white text-indigo-600 shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100'
                      : 'border-gray-200 bg-white text-gray-300'
                }`}
              >
                {task.status === 'completed' ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <span className="text-sm font-bold">{i + 1}</span>
                )}
              </div>
              <div className="mt-3 space-y-0.5">
                <div
                  className={`text-xs font-semibold leading-tight ${
                    task.status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'
                  }`}
                >
                  {task.label}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400">
                  {task.assignee === 'client' ? 'Jij' : 'NextWave'}
                </div>
                {task.note && <div className="text-[10px] font-medium text-indigo-600">{task.note}</div>}
                {task.id === 'dnc' && (
                  <Link
                    href="/dashboard/dnc"
                    className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 hover:shadow"
                  >
                    Openen
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function computeProgressWidth(tasks: CampaignTask[]): number {
  const completed = tasks.filter((t) => t.status === 'completed').length
  const total = tasks.length
  const currentIdx = tasks.findIndex((t) => t.status === 'current')
  const cursor = currentIdx === -1 ? completed - 0.5 : currentIdx
  if (cursor <= 0) return 0
  return (cursor / (total - 1)) * 100
}
