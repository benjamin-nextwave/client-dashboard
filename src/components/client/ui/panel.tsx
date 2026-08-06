/**
 * De basisvorm van het klantdashboard: 1px haarlijn, radius 12, geen schaduw.
 * Diepte komt van het contrast met de donkere sidebar en van de haarlijnen,
 * niet van box-shadows.
 */
export function Panel({
  title,
  meta,
  action,
  bodyClassName = 'px-5 py-[18px]',
  className = '',
  children,
}: {
  title?: string
  meta?: string
  action?: React.ReactNode
  /** Zet op '' wanneer de inhoud zelf zijn padding regelt. */
  bodyClassName?: string
  className?: string
  children: React.ReactNode
}) {
  const hasHeader = Boolean(title || meta || action)

  return (
    <section
      className={`flex flex-col overflow-hidden rounded-panel border border-line bg-panel transition-colors ${className}`}
    >
      {hasHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-[15px]">
          {title && (
            <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">{title}</h3>
          )}
          {meta && <span className="text-[11.5px] tabular-nums text-faint">{meta}</span>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

/** Knopvorm uit het ontwerp: 34px hoog, haarlijn, merk-tint bij hover. */
export const buttonClass =
  'inline-flex h-[34px] items-center gap-2 rounded-control border border-line bg-panel px-[13px] text-[12.5px] font-medium text-fg transition-colors hover:border-[var(--brand-32)] hover:bg-[var(--brand-08)] active:bg-[var(--brand-15)] disabled:opacity-50'
