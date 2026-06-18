import Link from 'next/link'

interface ShiftPickerProps {
  /** Pad-prefix waar ?shift=ochtend / ?shift=avond aan wordt gehangen. */
  basePath: string
  /** Pad terug — naar de persona-keuze. */
  backHref: string
  backLabel?: string
}

/**
 * Tussenstap voor Benjamin: kies tussen de ochtend- en de avondcontrole.
 * Beide rondes worden dagelijks uitgevoerd en hebben een eigen vragenlijst.
 * Na de keuze ga je naar dezelfde klantselectie, maar met de gekozen shift
 * in de URL zodat de juiste vragenlijst en "laatst gecheckt"-status laden.
 */
export function ShiftPicker({
  basePath,
  backHref,
  backLabel = 'Andere persoon kiezen',
}: ShiftPickerProps) {
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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
          Dagelijkse controle — Benjamin
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kies welke ronde je nu doet. Ochtend en avond doe je dagelijks, de analyse wekelijks — elk met een eigen vragenlijst.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ShiftCard
          href={`${basePath}?shift=ochtend`}
          name="Ochtendcontrole"
          gradient="from-amber-400 via-orange-400 to-yellow-500"
          shadowColor="shadow-orange-400/30"
          ringColor="hover:shadow-orange-400/40"
          description="Contacten, variabelen, inbox placement, sending volume en bedrijfsnaam/afzender."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          }
        />
        <ShiftCard
          href={`${basePath}?shift=avond`}
          name="Avondcontrole"
          gradient="from-indigo-600 via-violet-700 to-slate-800"
          shadowColor="shadow-violet-700/30"
          ringColor="hover:shadow-violet-700/40"
          description="Leads en reacties van vandaag, weerleggingen, verbeterkansen en contacten voor morgen."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          }
        />
        <ShiftCard
          href={`${basePath}?shift=wekelijks`}
          name="Wekelijkse analyse"
          gradient="from-emerald-500 via-teal-500 to-cyan-600"
          shadowColor="shadow-teal-500/30"
          ringColor="hover:shadow-teal-500/40"
          description="Diepere weekanalyse: reacties exporteren en categoriseren, weerleggingen, reply rate, opportunities en eindrapport naar de klant."
          icon={
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
        />
      </div>
    </div>
  )
}

function ShiftCard({
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
          Start deze ronde
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </Link>
  )
}
