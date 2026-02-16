export default function VoorvertoningLoading() {
  return (
    <div>
      <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-4 w-72 animate-pulse rounded bg-gray-100" />

      <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Table header */}
        <div className="flex gap-4 border-b px-6 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3 w-24 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-gray-50 px-6 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
