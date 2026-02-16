export default function InboxLoading() {
  return (
    <div>
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-1 h-4 w-56 animate-pulse rounded bg-gray-100" />

      <div className="mt-6 flex items-center justify-end">
        <div className="h-9 w-32 animate-pulse rounded-md bg-gray-200" />
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-64 animate-pulse rounded bg-gray-100" />
              </div>
              <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
