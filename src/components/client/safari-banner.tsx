'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'

export const SAFARI_BANNER_HIDE_EVENT = 'safari-banner:hide'
export const SAFARI_BANNER_SHOW_EVENT = 'safari-banner:show'

export function SafariBanner() {
  const t = useT()
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const hide = () => setHidden(true)
    const show = () => setHidden(false)
    window.addEventListener(SAFARI_BANNER_HIDE_EVENT, hide)
    window.addEventListener(SAFARI_BANNER_SHOW_EVENT, show)
    return () => {
      window.removeEventListener(SAFARI_BANNER_HIDE_EVENT, hide)
      window.removeEventListener(SAFARI_BANNER_SHOW_EVENT, show)
    }
  }, [])

  if (hidden) return null

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <p className="text-xs leading-relaxed text-amber-900">
        <span className="font-semibold">{t('inbox.safariBannerLabel')}</span> {t('inbox.safariBannerText')}
      </p>
    </div>
  )
}
