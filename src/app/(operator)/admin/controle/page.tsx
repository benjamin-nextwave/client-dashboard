import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ControlePage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center">
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        <BigButton
          href="/admin/controle/middag"
          gradient="from-amber-500 via-orange-500 to-rose-500"
          shadowColor="shadow-orange-500/30"
          ringColor="hover:shadow-orange-500/40"
          icon={
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          }
          subtitle="Middag"
          title="Takenlijst"
          description="Bekijk en vink de taken af die je vanochtend hebt aangemaakt."
        />
        <BigButton
          href="/admin/controle/ochtend"
          gradient="from-indigo-600 via-violet-600 to-fuchsia-600"
          shadowColor="shadow-violet-600/30"
          ringColor="hover:shadow-violet-600/40"
          icon={
            <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          }
          subtitle="Ochtend"
          title="Dagelijkse controle"
          description="Selecteer klanten en doorloop per klant een volledige campagnecontrole."
        />
        <SmallButton
          href="/admin/controle/geschiedenis"
          gradient="from-sky-500 via-cyan-500 to-teal-500"
          shadowColor="shadow-cyan-500/30"
          ringColor="hover:shadow-cyan-500/40"
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
          title="Controle geschiedenis"
          description="Bekijk per klant de controles en antwoorden van de afgelopen 5 dagen."
        />
        <SmallButton
          href="/admin/controle/excludeer"
          gradient="from-slate-600 via-gray-700 to-zinc-800"
          shadowColor="shadow-gray-700/30"
          ringColor="hover:shadow-gray-700/40"
          icon={
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
          title="Geëxcludeerde bedrijven"
          description="Beheer welke bedrijven niet in de dagelijkse controle verschijnen."
        />
      </div>
    </div>
  )
}

function BigButton({
  href,
  gradient,
  shadowColor,
  ringColor,
  icon,
  subtitle,
  title,
  description,
}: {
  href: string
  gradient: string
  shadowColor: string
  ringColor: string
  icon: React.ReactNode
  subtitle: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-10 text-white shadow-2xl ${shadowColor} transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${ringColor} min-h-[420px] flex flex-col justify-between`}
    >
      {/* Decorative glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl transition-opacity group-hover:opacity-50" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex items-start justify-between">
        <div className="rounded-2xl bg-white/15 p-4 backdrop-blur transition-transform group-hover:scale-110">
          {icon}
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
            {subtitle}
          </div>
        </div>
      </div>

      <div className="relative">
        <h2 className="text-4xl font-bold tracking-tight md:text-5xl">{title}</h2>
        <p className="mt-3 max-w-sm text-base opacity-90">{description}</p>
        <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold opacity-90 transition-all group-hover:translate-x-1 group-hover:opacity-100">
          Openen
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

function SmallButton({
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
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-6 text-white shadow-xl ${shadowColor} transition-all duration-300 hover:-translate-y-1 ${ringColor} flex flex-col justify-between min-h-[180px]`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl transition-opacity group-hover:opacity-50" />

      <div className="relative flex items-start gap-4">
        <div className="rounded-xl bg-white/15 p-3 backdrop-blur transition-transform group-hover:scale-110">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
          <p className="mt-1 text-sm opacity-90">{description}</p>
        </div>
      </div>

      <div className="relative mt-4 inline-flex items-center gap-2 text-xs font-semibold opacity-90 transition-all group-hover:translate-x-1 group-hover:opacity-100">
        Openen
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  )
}
