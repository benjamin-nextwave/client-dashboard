'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  LOCALE_ENGLISH_NAMES,
  makeTranslator,
  type Locale,
  type Translator,
} from './index'

interface I18nContextValue {
  locale: Locale
  t: Translator
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface ProviderProps {
  locale: Locale
  children: ReactNode
}

export function I18nProvider({ locale, children }: ProviderProps) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, t: makeTranslator(locale) }),
    [locale]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Fallback: gebruik default zodat losse client-componenten zonder
    // provider niet crashen (bv. in storybook of unit-tests).
    return makeTranslator('nl')
  }
  return ctx.t
}

export function useLocale(): Locale {
  return useContext(I18nContext)?.locale ?? 'nl'
}

// Voor client-side webhook calls: { language: 'Dutch', language_code: 'nl' }
export function useWebhookLocale(): { language: string; language_code: Locale } {
  const locale = useLocale()
  return { language: LOCALE_ENGLISH_NAMES[locale], language_code: locale }
}
