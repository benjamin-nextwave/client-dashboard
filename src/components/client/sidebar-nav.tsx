'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { NavItem } from '@/components/client/nav-item'
import { useT } from '@/lib/i18n/client'

const STORAGE_KEY = 'nw-sidebar-collapsed'
const WIDTH_EXPANDED = '240px'
const WIDTH_COLLAPSED = '64px'

/**
 * Hulp & uitleg toont de chatbot ingebouwd in de pagina; overal elders zweeft
 * hij rechtsonder. De bundel van de chatbot leest zijn configuratie één keer
 * bij het laden, dus die twee standen kunnen niet in dezelfde sessie naast
 * elkaar bestaan. Navigatie van én naar deze pagina gaat daarom met een volledige
 * paginalading in plaats van client-side.
 */
const HELP_ROUTE = '/dashboard/hulp'

interface SidebarNavProps {
  signOutAction: () => Promise<void>
  inboxUrl?: string
  inboxVisible?: boolean
  leadInboxVisible?: boolean
}

interface NavItemData {
  href: string
  label: string
  icon: React.ReactNode
}

interface NavGroup {
  title: string
  items: NavItemData[]
}

export function SidebarNav({ signOutAction, inboxUrl, inboxVisible, leadInboxVisible }: SidebarNavProps) {
  const t = useT()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  // Voorkeur pas na de eerste render inlezen: localStorage bestaat niet op de
  // server, en hem in de initiële state stoppen zou een hydration-mismatch geven.
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(STORAGE_KEY) === '1')
  }, [])

  // De lead inbox hangt met position: fixed naast de zijbalk en kan de breedte
  // niet uit de DOM afleiden. Via deze variabele schuift hij mee.
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w',
      collapsed ? WIDTH_COLLAPSED : WIDTH_EXPANDED
    )
  }, [collapsed])

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }
  const overviewItems: NavItemData[] = [
    {
      href: '/dashboard',
      label: t('nav.overview'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    ...(inboxUrl && inboxVisible
      ? [
          {
            href: '/dashboard/inbox-embed',
            label: t('nav.email'),
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            ),
          },
        ]
      : []),
    ...(leadInboxVisible
      ? [
          {
            href: '/dashboard/lead-inbox',
            label: 'Lead Inbox',
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
              </svg>
            ),
          },
        ]
      : []),
  ]

  const campagneItems: NavItemData[] = [
    {
      href: '/dashboard/campagne-leads',
      label: t('nav.leads'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/crm',
      label: t('nav.crm'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/dnc',
      label: t('nav.dnc'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/contacten',
      label: t('nav.contacts'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
        </svg>
      ),
    },
  ]

  const mijnCampagneItems: NavItemData[] = [
    {
      href: '/dashboard/mijn-campagne',
      label: t('nav.onboarding'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/rapporten',
      label: t('nav.reports'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/mailvarianten',
      label: t('nav.mailVariants'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
        </svg>
      ),
    },
    {
      href: HELP_ROUTE,
      label: t('nav.help'),
      // Twee pratende bellen in plaats van een vraagteken: de pagina opent op
      // de assistent, niet op een lap uitleg.
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
    },
  ]

  const groups: NavGroup[] = [
    { title: '', items: overviewItems },
    { title: t('nav.groupCampaign'), items: campagneItems },
    { title: t('nav.groupMyCampaign'), items: mijnCampagneItems },
  ]

  return (
    // Uitgeklapt bewust 240px en niet de 244px uit het ontwerp: de inbox-embed
    // positioneert zijn iframe met vaste pixelwaarden die op deze breedte zijn
    // afgestemd.
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden bg-ink transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Merk-gloed vanaf de bovenkant — de enige plek waar de klantkleur het
          vlak zelf vult. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--brand-20),transparent_320px)]"
      />

      {/* Merk — Nextwave, niet het klantlogo. De band eromheen heeft een vaste
          hoogte: het brede logo is ~44px hoog, het merkteken maar ~12px, en
          zonder die band zou alles eronder bij het inklappen 32px omhoog
          springen. */}
      <div
        className={`relative flex shrink-0 items-center pb-3 pt-4 ${
          collapsed ? 'justify-center px-3' : 'px-5'
        }`}
      >
        <span className="flex h-11 items-center">
          <Image
            src={collapsed ? '/nextwave-logo-mark.png' : '/nextwave-logo-wide.png'}
            alt="Nextwave Solutions"
            width={collapsed ? 96 : 560}
            height={collapsed ? 36 : 165}
            priority
            className={collapsed ? 'h-auto w-8' : 'h-auto w-[150px]'}
          />
        </span>
      </div>

      {/* Navigatie */}
      <nav className="relative min-h-0 flex-1 overflow-hidden px-3 py-0.5">
        {groups.map((group, i) => (
          <div key={i} className="mb-2">
            {/* Groepskop en de haarlijn die hem ingeklapt vervangt zijn even
                hoog (21px), zodat de iconen in beide standen op dezelfde
                hoogte blijven staan. */}
            {group.title &&
              (collapsed ? (
                <div className="flex h-[21px] items-center px-3" aria-hidden>
                  <span className="h-px w-full bg-white/[0.09]" />
                </div>
              ) : (
                <div className="h-[21px] px-3 pt-0.5 text-[10px] font-semibold uppercase leading-[15px] tracking-[0.18em] text-white/30">
                  {group.title}
                </div>
              ))}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  collapsed={collapsed}
                  reload={item.href === HELP_ROUTE || pathname === HELP_ROUTE}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* In- en uitklappen */}
      <div className="relative shrink-0 px-2.5 pb-0.5">
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Zijbalk uitklappen' : 'Zijbalk inklappen'}
          aria-label={collapsed ? 'Zijbalk uitklappen' : 'Zijbalk inklappen'}
          aria-expanded={!collapsed}
          className={`flex h-[33px] w-full items-center rounded-control text-[12.5px] text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 ${
            collapsed ? 'justify-center px-0' : 'gap-3 px-3'
          }`}
        >
          <svg
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              collapsed ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.6}
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5 11.25 12l7.5-7.5M11.25 19.5 3.75 12l7.5-7.5" />
          </svg>
          {!collapsed && <span className="flex-1 text-left">Inklappen</span>}
        </button>
      </div>

      {/* Uitloggen */}
      <div className="relative shrink-0 border-t border-white/[0.09] p-2">
        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? t('nav.signOut') : undefined}
            className={`flex h-[33px] w-full items-center rounded-control text-[12.5px] text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 ${
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
    </aside>
  )
}
