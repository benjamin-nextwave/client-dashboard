'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  LOCALE_FLAG,
  LOCALE_NATIVE_NAMES,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/lib/i18n'
import { useT, useLocale } from '@/lib/i18n/client'
import { setLocale as setLocaleAction } from '@/lib/i18n/actions'

export function LanguageSwitcher() {
  const router = useRouter()
  const t = useT()
  const currentLocale = useLocale()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', escHandler)
    }
  }, [open])

  const handleSelect = (locale: Locale) => {
    if (locale === currentLocale) {
      setOpen(false)
      return
    }
    startTransition(async () => {
      const result = await setLocaleAction(locale)
      if (!result.error) {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <div ref={ref} className="fixed right-5 top-5 z-40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        className={`group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-600 hover:shadow disabled:opacity-60 ${
          open ? 'ring-2 ring-indigo-200' : ''
        }`}
        aria-label={t('locale.chooseLanguage')}
      >
        <span className="text-base leading-none">{LOCALE_FLAG[currentLocale]}</span>
        <span className="hidden sm:inline">{LOCALE_NATIVE_NAMES[currentLocale]}</span>
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {t('locale.chooseLanguage')}
          </div>
          <ul className="py-1">
            {SUPPORTED_LOCALES.map((l) => {
              const active = l === currentLocale
              return (
                <li key={l}>
                  <button
                    type="button"
                    onClick={() => handleSelect(l)}
                    disabled={pending}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base leading-none">{LOCALE_FLAG[l]}</span>
                    <span className="flex-1 font-medium">{LOCALE_NATIVE_NAMES[l]}</span>
                    {active && (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
