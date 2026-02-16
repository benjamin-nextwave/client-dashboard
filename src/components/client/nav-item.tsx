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

  const className = `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-brand/10 text-brand font-semibold'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`

  const content = (
    <>
      {icon}
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
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
