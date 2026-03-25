export default function InboxEmbedLoading() {
  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh)] items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
        <p className="text-sm text-gray-500">Inbox laden...</p>
      </div>
    </div>
  )
}
