import Link from 'next/link'

interface Props {
  /** Nog geen enkele inzending gedaan (formSubmissionCount === 0). */
  isFirst: boolean
}

/**
 * Losstaande invulformulier-kaart. Verschijnt zodra NextWave een (extra)
 * invulformulier heeft klaargezet, óók nadat de onboarding is afgerond — zodat
 * een klant tijdens een lopende campagne aanvullende informatie kan delen.
 */
export function AvailableFormCard({ isFirst }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm shadow-amber-200/40">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-3xl" />
      <div className="relative flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-1 ring-amber-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-gray-900">
            {isFirst ? 'Invulformulier beschikbaar' : 'Extra invulformulier beschikbaar'}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {isFirst
              ? 'NextWave heeft een invulformulier voor je klaargezet. Vul het in om je gegevens te delen.'
              : 'NextWave heeft een nieuw invulformulier voor je klaargezet — handig om tijdens je lopende campagne extra informatie te delen. Je eerdere antwoorden blijven bewaard.'}
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/mijn-campagne/invulformulier"
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-xl"
            >
              {isFirst ? 'Invulformulier invullen' : 'Nieuw invulformulier invullen'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
