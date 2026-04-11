interface Props {
  isOnboardingComplete: boolean
}

export function ContactBlock({ isOnboardingComplete }: Props) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-indigo-100">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">Contact en ondersteuning</h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-gray-600">
            {!isOnboardingComplete ? (
              <>
                <p>
                  Heb je vragen, opmerkingen of aanvullingen over jouw mailvarianten, voorvertoning
                  of iets anders gedurende deze onboarding-periode? Neem dan direct contact op met{' '}
                  <a
                    href="mailto:benjamin@nextwave-solutions.nl"
                    className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    benjamin@nextwave-solutions.nl
                  </a>
                  .
                </p>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
                  <strong className="font-semibold">Let op:</strong> Dit directe contact geldt
                  uitsluitend voor de duur van de onboarding. Zodra de onboarding is afgerond
                  verloopt alle communicatie via de{' '}
                  <a href="/dashboard/feedback" className="font-semibold underline hover:text-amber-950">
                    contactpagina
                  </a>{' '}
                  van het dashboard. Alleen in dringende noodgevallen kun je daarna terecht bij{' '}
                  <a
                    href="mailto:merlijn@nextwave-solutions.nl"
                    className="font-semibold underline hover:text-amber-950"
                  >
                    merlijn@nextwave-solutions.nl
                  </a>
                  . Na de onboarding vervalt het contact met Benjamin.
                </div>
              </>
            ) : (
              <>
                <p>
                  De onboarding is afgerond. Voor vragen, opmerkingen of feedback maak je gebruik
                  van de{' '}
                  <a href="/dashboard/feedback" className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                    contactpagina
                  </a>{' '}
                  van dit dashboard.
                </p>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-700">
                  Alleen in dringende noodgevallen kun je terecht bij{' '}
                  <a
                    href="mailto:merlijn@nextwave-solutions.nl"
                    className="font-semibold text-gray-900 underline hover:text-gray-950"
                  >
                    merlijn@nextwave-solutions.nl
                  </a>
                  .
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
