'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n/client'

interface OperatorHeaderProps {
  signOutAction: () => Promise<void>
}

export function OperatorHeader({ signOutAction }: OperatorHeaderProps) {
  const pathname = usePathname() ?? ''
  const t = useT()

  // NAV is built inside the component so the news entry can use the t() helper
  // (D-19: news label is the only localized nav entry; existing labels stay
  // hardcoded Dutch — out of scope to refactor in Phase 9). The news entry sits
  // between Overzicht and Fouten, grouping content/announcements before
  // operational tabs. The match predicate uses startsWith('/admin/news') so
  // /admin/news/new and /admin/news/[id]/edit also light up the active state.
  const NAV = [
    { href: '/admin', label: 'Klanten', match: (p: string) => p === '/admin' || p.startsWith('/admin/clients') },
    { href: '/admin/controle', label: 'Controle', match: (p: string) => p.startsWith('/admin/controle') },
    { href: '/admin/taken', label: 'Taken', match: (p: string) => p.startsWith('/admin/taken') },
    // Alleen het centrale overzicht; de loopgang per klant zit onder /admin/clients
    // en hoort bij de tab Klanten.
    { href: '/admin/loopgang', label: 'Loopgang', match: (p: string) => p === '/admin/loopgang' },
    { href: '/admin/commissies', label: 'Commissies', match: (p: string) => p.startsWith('/admin/commissies') },
    // Financieel is geen losse pagina maar een uitklapmenu; het zit hierna in de
    // balk en staat daarom niet in deze lijst.
    { href: '/admin/overzicht', label: 'Overzicht', match: (p: string) => p.startsWith('/admin/overzicht') },
    { href: '/admin/news', label: t('operator.nav.news'), match: (p: string) => p.startsWith('/admin/news') },
    { href: '/admin/errors', label: 'Fouten', match: (p: string) => p.startsWith('/admin/errors') },
    { href: '/admin/bezwaren', label: 'Bezwaren', match: (p: string) => p.startsWith('/admin/bezwaren') },
  ]

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
              <Fragment key={item.href}>
                <Link
                  href={item.href}
                  className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
                {item.href === '/admin/commissies' && <FinancieelMenu pathname={pathname} />}
              </Fragment>
            )
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/admin/tekentafel"
            aria-label="De tekentafel"
            title="De tekentafel — schrijf mailvarianten uit"
            className="group relative inline-flex h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50 px-3.5 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            {/* Pencil */}
            <svg className="h-4 w-4 text-indigo-600 transition-transform group-hover:-rotate-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
            </svg>
            De tekentafel
          </Link>
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

const FINANCIEEL = [
  { href: '/admin/financieel/facturen', label: 'Facturen' },
  { href: '/admin/financieel/uitgaves', label: 'Uitgaves' },
]

/**
 * Facturen en uitgaves zijn allebei geldpagina's zonder eigen plek in de balk.
 * Ze krijgen daarom één knop met een uitklapmenu, zodat de balk niet twee tabs
 * langer wordt voor iets wat je een paar keer per maand opent.
 */
function FinancieelMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = pathname.startsWith('/admin/financieel')

  // Zonder dit blijft het menu openstaan zodra je ergens anders klikt.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Na een navigatie hoort het menu dicht te zijn.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
          active || open
            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5'
            : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        Financieel
        <svg
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-2 w-40 -translate-x-1/2 overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
        >
          {FINANCIEEL.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
