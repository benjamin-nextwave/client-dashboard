import Link from 'next/link'
import { getAllTasks, getManualTaskClientOptions } from '@/lib/data/controle'
import { TaskList } from './_components/task-list'

export const dynamic = 'force-dynamic'

export default async function MiddagPage() {
  const [tasks, clientOptions] = await Promise.all([
    getAllTasks(),
    getManualTaskClientOptions(),
  ])

  const openCount = tasks.filter((t) => !t.isCompleted).length
  const completedCount = tasks.filter((t) => t.isCompleted).length

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
          Takenlijst — Middag
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Alle taken die je tijdens controlerondes hebt aangemaakt. Taken
          blijven hier staan tot je ze handmatig afvinkt of verwijdert.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SummaryChip label="Te doen" value={openCount} tone="open" />
        <SummaryChip label="Afgerond" value={completedCount} tone="done" />
        <SummaryChip label="Totaal" value={tasks.length} tone="total" />
      </div>

      <TaskList tasks={tasks} clientOptions={clientOptions} />
    </div>
  )
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'open' | 'done' | 'total'
}) {
  const classes = {
    open: 'bg-amber-50 text-amber-700 ring-amber-200',
    done: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    total: 'bg-gray-50 text-gray-700 ring-gray-200',
  }[tone]

  return (
    <div className={`inline-flex items-baseline gap-2 rounded-xl px-4 py-2 ring-1 ${classes}`}>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
    </div>
  )
}
