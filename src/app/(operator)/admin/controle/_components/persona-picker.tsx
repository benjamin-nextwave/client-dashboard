import Link from 'next/link'

interface PersonaPickerProps {
  /** Pad-prefix waar /benjamin of /merlijn aan wordt vastgeplakt. */
  basePath: string
  /** Titel boven de keuzeknoppen. */
  title: string
  /** Subtitel met context (welke flow je kiest). */
  subtitle: string
  /** Pad terug — meestal naar de controle-hoofdpagina. */
  backHref: string
  backLabel?: string
}

/**
 * Tussenstap tussen het hoofdmenu van /admin/controle en de daadwerkelijke
 * flow (dagelijkse controle of takenlijst). De gebruiker kiest hier voor
 * Benjamin of Merlijn — daarna gaat hij naar de juiste persona-route.
 */
export function PersonaPicker({
  basePath,
  title,
  subtitle,
  backHref,
  backLabel = 'Terug naar Controle',
}: PersonaPickerProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          {backLabel}
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <PersonaCard
          href={`${basePath}/benjamin`}
          name="Benjamin"
          gradient="from-indigo-600 via-violet-600 to-fuchsia-600"
          shadowColor="shadow-violet-600/30"
          ringColor="hover:shadow-violet-600/40"
          description="Strategische controle: schema, target-aanpassingen en mailvariant-variabelen."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
        />
        <PersonaCard
          href={`${basePath}/merlijn`}
          name="Merlijn"
          gradient="from-amber-500 via-orange-500 to-rose-500"
          shadowColor="shadow-orange-500/30"
          ringColor="hover:shadow-orange-500/40"
          description="Operationele controle: contactvolumes, mailboxen, varianten en CSV's."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        />
      </div>
    </div>
  )
}

function PersonaCard({
  href,
  name,
  description,
  gradient,
  shadowColor,
  ringColor,
  icon,
}: {
  href: string
  name: string
  description: string
  gradient: string
  shadowColor: string
  ringColor: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-2xl ${shadowColor} transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${ringColor} min-h-[260px] flex flex-col justify-between`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl transition-opacity group-hover:opacity-50" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div className="rounded-2xl bg-white/15 p-3 backdrop-blur transition-transform group-hover:scale-110">
          {icon}
        </div>
      </div>

      <div className="relative">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{name}</h2>
        <p className="mt-2 max-w-sm text-sm opacity-90">{description}</p>
        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold opacity-90 transition-all group-hover:translate-x-1 group-hover:opacity-100">
          Start als {name}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
