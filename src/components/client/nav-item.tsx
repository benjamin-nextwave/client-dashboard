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

  const className = `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
    isActive
      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5'
      : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
  }`

  const content = (
    <>
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand"
          aria-hidden
        />
      )}
      <span
        className={`flex h-5 w-5 items-center justify-center transition-colors ${
          isActive ? 'text-brand' : 'text-gray-400 group-hover:text-gray-600'
        }`}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
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
