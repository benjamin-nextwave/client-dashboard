interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mt-8 flex flex-col items-center rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
