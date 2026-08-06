/**
 * Lege staat in de stijl van het klantdashboard.
 *
 * Bewust een eigen bestand naast @/components/ui/empty-state: dat component
 * wordt óók door het admin dashboard gebruikt en moet daar onveranderd blijven.
 * Props zijn identiek, zodat omzetten alleen een gewijzigde import is.
 */
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-panel border border-line bg-panel px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-track text-faint">
        {icon}
      </div>
      <h3 className="mt-4 text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
