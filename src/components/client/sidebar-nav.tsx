'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { NavItem } from '@/components/client/nav-item'
import { useT } from '@/lib/i18n/client'

const STORAGE_KEY = 'nw-sidebar-collapsed'
const WIDTH_EXPANDED = '240px'
const WIDTH_COLLAPSED = '64px'

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

  const ondersteuningItems: NavItemData[] = [
    {
      href: '/dashboard/mijn-campagne',
      label: t('nav.myCampaign'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/feedback',
      label: t('nav.contact'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
    },
    {
      href: '/dashboard/voorkeuren',
      label: t('nav.settings'),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      ),
    },
  ]

  const groups: NavGroup[] = [
    { title: '', items: overviewItems },
    { title: t('nav.groupCampaign'), items: campagneItems },
    { title: t('nav.groupSupport'), items: ondersteuningItems },
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

      {/* Merk — Nextwave, niet het klantlogo */}
      <div
        className={`relative flex items-center pb-3 pt-4 ${
          collapsed ? 'justify-center px-3' : 'px-5'
        }`}
      >
        <Image
          src={collapsed ? '/nextwave-logo-mark.png' : '/nextwave-logo-wide.png'}
          alt="Nextwave Solutions"
          width={collapsed ? 96 : 560}
          height={collapsed ? 36 : 165}
          priority
          className={collapsed ? 'h-auto w-8' : 'h-auto w-[150px]'}
        />
      </div>

      {/* Navigatie */}
      <nav className="relative min-h-0 flex-1 overflow-hidden px-3 py-0.5">
        {groups.map((group, i) => (
          <div key={i} className="mb-2">
            {group.title &&
              (collapsed ? (
                <div className="mx-3 mb-1 mt-0.5 border-t border-white/[0.09]" aria-hidden />
              ) : (
                <div className="px-3 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
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
          className={`flex w-full items-center rounded-control py-[7px] text-[12.5px] text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 ${
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
            className={`flex w-full items-center rounded-control py-[7px] text-[12.5px] text-white/60 transition-colors hover:bg-white/5 hover:text-white/90 ${
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
