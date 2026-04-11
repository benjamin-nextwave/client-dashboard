import Link from 'next/link'

interface Props {
  hasSubmissions: boolean
  submissionCount: number
}

export function FormReviewButton({ hasSubmissions, submissionCount }: Props) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6 9.75-3 3m0 0-3-3m3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Invulformulier</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {hasSubmissions
              ? submissionCount === 1
                ? 'Bekijk het invulformulier dat je eerder hebt ingediend.'
                : `Bekijk al je ${submissionCount} ingediende invulformulieren.`
              : 'Nog niet ingevuld — beschikbaar zodra het formulier is verstuurd.'}
          </p>
        </div>
      </div>
      {hasSubmissions ? (
        <Link
          href="/dashboard/mijn-campagne/antwoorden"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600 hover:shadow"
        >
          {submissionCount === 1 ? 'Invulformulier inzien' : 'Invulformulieren inzien'}
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-400"
        >
          Invulformulier inzien
        </button>
      )}
    </section>
  )
}
