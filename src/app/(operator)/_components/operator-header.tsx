'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface OperatorHeaderProps {
  signOutAction: () => Promise<void>
}

const NAV = [
  { href: '/admin', label: 'Klanten', match: (p: string) => p === '/admin' || p.startsWith('/admin/clients') },
  { href: '/admin/errors', label: 'Fouten', match: (p: string) => p.startsWith('/admin/errors') },
  { href: '/admin/feedback', label: 'Feedback', match: (p: string) => p.startsWith('/admin/feedback') },
  { href: '/admin/bezwaren', label: 'Bezwaren', match: (p: string) => p.startsWith('/admin/bezwaren') },
  { href: '/admin/mail-client', label: 'Mailen', match: (p: string) => p.startsWith('/admin/mail-client') },
]

export function OperatorHeader({ signOutAction }: OperatorHeaderProps) {
  const pathname = usePathname() ?? ''

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6 lg:px-10">
        {/* Logo */}
        <Link href="/admin" className="group flex items-center leading-tight">
          <div className="text-sm font-bold tracking-tight text-gray-900 transition-colors group-hover:text-indigo-600">NextWave</div>
          <div className="ml-2 hidden text-[10px] font-medium uppercase tracking-[0.15em] text-gray-400 sm:block">Operator Console</div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
          {NAV.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              Uitloggen
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
