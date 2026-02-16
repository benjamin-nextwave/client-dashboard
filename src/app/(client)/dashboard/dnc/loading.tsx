export default function DncLoading() {
  return (
    <div>
      <div className="h-8 w-44 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-4 w-80 animate-pulse rounded bg-gray-100" />

      <div className="mt-6 space-y-6">
        {/* Add form skeleton */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 flex gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-md bg-gray-100" />
            <div className="h-10 w-32 animate-pulse rounded-md bg-gray-200" />
          </div>
        </div>

        {/* List skeleton */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
