'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Er is iets misgegaan
      </h2>
      <p className="text-sm text-gray-600">
        {error.message || 'Een onverwachte fout is opgetreden.'}
      </p>
      <button
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Opnieuw proberen
      </button>
    </div>
  )
}
