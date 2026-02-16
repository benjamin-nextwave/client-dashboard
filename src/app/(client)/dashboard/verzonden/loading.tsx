export default function VerzondenLoading() {
  return (
    <div>
      <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-100" />

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-72 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
