import Link from 'next/link'
import { getClientList } from '@/lib/data/admin-stats'
import { getEarliestLeadDate } from '@/lib/data/export-data'
import { DataExportDialog } from '@/components/admin/data-export-dialog'

export const dynamic = 'force-dynamic'

export default async function CommissiesPage() {
  const [allClients, earliestDate] = await Promise.all([getClientList(), getEarliestLeadDate()])

  const exportClients = allClients.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    isHidden: c.isHidden,
  }))

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bedrijfsbreed</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Commissies</h1>
        <p className="mt-1 text-sm text-gray-500">Kies wat je wilt bekijken.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ChoiceCard
          href="/admin/commissies/financieel"
          gradient="from-emerald-500 via-teal-500 to-cyan-600"
          shadowColor="shadow-teal-500/30"
          ringColor="hover:shadow-teal-500/40"
          title="Financieel overzicht"
          description="Commissies en netto winst per klant, met een grafiek van het netto bedrag per dag."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
        />
        <ChoiceCard
          href="/admin/commissies/leads"
          gradient="from-indigo-600 via-violet-600 to-fuchsia-600"
          shadowColor="shadow-violet-600/30"
          ringColor="hover:shadow-violet-600/40"
          title="Lead geschiedenis"
          description="Alle leads ooit, met zoeken, filteren, afvinken en export van mailadressen."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
            </svg>
          }
        />
        <DataExportDialog clients={exportClients} earliestDate={earliestDate} variant="card" />
      </div>
    </div>
  )
}

function ChoiceCard({
  href,
  gradient,
  shadowColor,
  ringColor,
  icon,
  title,
  description,
}: {
  href: string
  gradient: string
  shadowColor: string
  ringColor: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-2xl ${shadowColor} transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${ringColor} min-h-[240px] flex flex-col justify-between`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl transition-opacity group-hover:opacity-50" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      <div className="relative rounded-2xl bg-white/15 p-3 backdrop-blur transition-transform group-hover:scale-110 w-fit">
        {icon}
      </div>

      <div className="relative">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-sm text-sm opacity-90">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold opacity-90 transition-all group-hover:translate-x-1 group-hover:opacity-100">
          Openen
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
