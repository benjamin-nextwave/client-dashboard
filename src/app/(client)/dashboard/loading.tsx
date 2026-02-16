export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Title skeleton */}
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-white p-6 shadow-sm">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-8 w-20 animate-pulse rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Pipeline skeleton */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 flex-1 animate-pulse rounded bg-gray-200"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
        <div className="h-72 animate-pulse rounded-lg bg-white shadow-sm" />
      </div>
    </div>
  )
}
