'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  external?: boolean
  collapsed?: boolean
  /** Navigeer met een volledige paginalading in plaats van client-side. */
  reload?: boolean
  /** Oranje uitroepteken: er wacht iets op een reactie van de klant. */
  alert?: boolean
  /** Toelichting bij het uitroepteken, ook als titel op de rij. */
  alertLabel?: string
}

export function NavItem({
  href,
  label,
  icon,
  badge,
  external,
  collapsed,
  reload,
  alert,
  alertLabel,
}: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    pathname === href || (pathname.startsWith(href) && href !== '/dashboard')

  // Vaste rijhoogte. Uitgeklapt bepaalt het tekstregelvakje (12.5px) de hoogte,
  // ingeklapt zou dat het 16px-icoon zijn — dan zakt de hele balk per item een
  // paar pixels in en staan de iconen niet meer op dezelfde hoogte als in de
  // uitgeklapte stand.
  const className = `group relative flex h-[33px] items-center rounded-control text-[12.5px] transition-colors ${
    collapsed ? 'justify-center px-0' : 'gap-3 px-3'
  } ${
    isActive
      ? 'bg-white/10 font-semibold text-white'
      : 'font-normal text-white/60 hover:bg-white/5 hover:text-white/90 active:bg-white/[0.14]'
  }`

  const content = (
    <>
      {isActive && (
        <span
          className="absolute inset-y-2 left-0 w-0.5 rounded-r-sm bg-brand-lift"
          aria-hidden
        />
      )}
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        {icon}
        {/* Ingeklapt is er geen ruimte naast de tekst, dus hangt het teken als
            stip rechtsboven het icoon. */}
        {alert && collapsed && (
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-warn-ink ring-2 ring-ink"
            aria-hidden
          />
        )}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1">{label}</span>
          {alert && <AlertMark />}
          {badge != null && badge > 0 && (
            <span className="text-[10.5px] font-semibold tabular-nums text-white/50">
              {badge}
            </span>
          )}
        </>
      )}
    </>
  )

  const title = collapsed
    ? alert && alertLabel
      ? `${label} — ${alertLabel}`
      : label
    : alert && alertLabel
      ? alertLabel
      : undefined

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={title}
        aria-label={collapsed ? label : undefined}
      >
        {content}
      </a>
    )
  }

  if (reload) {
    return (
      <a
        href={href}
        className={className}
        title={title}
        aria-label={collapsed ? label : undefined}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      href={href}
      className={className}
      title={title}
      aria-label={collapsed ? label : undefined}
    >
      {content}
    </Link>
  )
}

/**
 * Oranje uitroepteken achter een navigatie-item. Geen aantal: het zegt alleen
 * "hier wacht iets op je", en verdwijnt zodra dat niet meer zo is.
 */
function AlertMark() {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-warn-ink/15 text-warn-ink"
      aria-hidden
    >
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.6} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v6m0 4.25h.008v.008H12v-.008Z" />
      </svg>
    </span>
  )
}
