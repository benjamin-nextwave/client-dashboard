import { nl, type Translations } from './translations/nl'
import { en } from './translations/en'
import { hi } from './translations/hi'

export const SUPPORTED_LOCALES = ['nl', 'en', 'hi'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'nl'

export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  hi: 'हिन्दी',
}

// Universele Engelse benamingen — gebruikt in webhook payloads en chatbot
// system prompts zodat externe systemen / AI-modellen consistent reageren.
export const LOCALE_ENGLISH_NAMES: Record<Locale, string> = {
  nl: 'Dutch',
  en: 'English',
  hi: 'Hindi',
}

export const LOCALE_FLAG: Record<Locale, string> = {
  nl: '🇳🇱',
  en: '🇬🇧',
  hi: '🇮🇳',
}

const dictionaries: Record<Locale, Translations> = { nl, en, hi }

export function getDictionary(locale: Locale): Translations {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE]
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export type { Translations }

// Path-helper: t.flow.handledBy → string. Vervangt {placeholders} met values.
type PathInto<T, P extends string = ''> = T extends string
  ? P
  : {
      [K in keyof T]: T[K] extends string
        ? `${P extends '' ? '' : `${P}.`}${string & K}`
        : PathInto<T[K], `${P extends '' ? '' : `${P}.`}${string & K}`>
    }[keyof T]

export type TranslationKey = PathInto<Translations>

function getNested(obj: unknown, path: string): string | undefined {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj) as string | undefined
}

export function makeTranslator(locale: Locale) {
  const dict = getDictionary(locale)
  return function t(
    key: TranslationKey,
    vars?: Record<string, string | number>
  ): string {
    const found = getNested(dict, key) ?? getNested(getDictionary(DEFAULT_LOCALE), key)
    if (typeof found !== 'string') return key
    if (!vars) return found
    return found.replace(/\{(\w+)\}/g, (_, name) =>
      name in vars ? String(vars[name]) : `{${name}}`
    )
  }
}

export type Translator = ReturnType<typeof makeTranslator>
