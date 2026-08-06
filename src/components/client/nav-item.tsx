'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  external?: boolean
}

export function NavItem({ href, label, icon, badge, external }: NavItemProps) {
  const pathname = usePathname()
  const isActive =
    pathname === href || (pathname.startsWith(href) && href !== '/dashboard')

  const className = `group relative flex items-center gap-3 rounded-control px-3 py-[9px] text-[12.5px] transition-colors ${
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
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[10.5px] font-semibold tabular-nums text-white/50">
          {badge}
        </span>
      )}
    </>
  )

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  )
}
