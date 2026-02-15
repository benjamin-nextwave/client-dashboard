export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="animate-pulse rounded-lg border border-gray-200">
        <div className="h-12 border-b border-gray-200 bg-gray-100" />
        <div className="divide-y divide-gray-200">
          <div className="h-12 bg-white" />
          <div className="h-12 bg-white" />
          <div className="h-12 bg-white" />
          <div className="h-12 bg-white" />
          <div className="h-12 bg-white" />
        </div>
      </div>
    </div>
  )
}
