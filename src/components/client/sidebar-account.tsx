'use client'

import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/client'

interface SidebarAccountProps {
  signOutAction: () => Promise<void>
  email: string | null
  logoUrl: string | null
  companyName: string | null
  collapsed: boolean
}

function initialsOf(name: string | null, email: string | null) {
  const source = name?.trim() || email?.trim() || ''
  if (!source) return '?'
  const words = source.split(/[\s@._-]+/).filter(Boolean)
  return (words[0]?.[0] ?? '?').toUpperCase()
}

export function SidebarAccount({
  signOutAction,
  email,
  logoUrl,
  companyName,
  collapsed,
}: SidebarAccountProps) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Inklappen laat het paneel op een halve breedte achter; dan liever dicht.
  useEffect(() => setOpen(false), [collapsed])

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const label = email ?? companyName ?? ''

  return (
    // De zijbalk staat op overflow-hidden, dus het paneel zweeft bewust binnen
    // haar randen: absoluut boven deze rij in plaats van erbuiten.
    <div ref={wrapRef} className="relative shrink-0 border-t border-white/[0.09] p-2">
      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 rounded-control border border-white/10 bg-ink p-1">
          <form action={signOutAction}>
            <button
              type="submit"
              title={collapsed ? t('nav.signOut') : undefined}
              className={`flex h-[33px] w-full items-center rounded-control text-[12.5px] text-white/70 transition-colors hover:bg-white/5 hover:text-white ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-3'
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              {!collapsed && t('nav.signOut')}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={collapsed ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-[38px] w-full items-center rounded-control transition-colors hover:bg-white/5 ${
          open ? 'bg-white/5' : ''
        } ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2'}`}
      >
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-control bg-white/10 text-[11.5px] font-semibold text-white/70">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- klantlogo's staan op wisselende hosts
            <img src={logoUrl} alt={companyName ?? ''} className="h-full w-full object-contain" />
          ) : (
            initialsOf(companyName, email)
          )}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-[12px] text-white/70">{label}</span>
            <svg
              className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform duration-150 ${
                open ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </>
        )}
      </button>
    </div>
  )
}
