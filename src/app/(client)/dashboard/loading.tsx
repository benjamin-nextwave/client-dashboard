export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-24 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
    </div>
  )
}
