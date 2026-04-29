import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_ENGLISH_NAMES,
  makeTranslator,
  type Locale,
  type Translator,
} from './index'

const COOKIE_NAME = 'dashboard_locale'

export async function getLocale(): Promise<Locale> {
  // 1. Cookie wint (snel, geen DB-roundtrip)
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(COOKIE_NAME)?.value
  if (isLocale(fromCookie)) return fromCookie

  // 2. Anders: profiles.language (alleen als ingelogd)
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data } = await admin
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .maybeSingle()
      if (isLocale(data?.language)) return data!.language as Locale
    }
  } catch {
    // ignore — gebruik default
  }

  return DEFAULT_LOCALE
}

export async function getTranslator(): Promise<Translator> {
  const locale = await getLocale()
  return makeTranslator(locale)
}

export async function getLocaleForUser(userId: string): Promise<Locale> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('language')
    .eq('id', userId)
    .maybeSingle()
  return isLocale(data?.language) ? (data!.language as Locale) : DEFAULT_LOCALE
}

// Returnt object met locale-code + Engelse naam, klaar om in webhook
// payloads als { language: 'Dutch', language_code: 'nl' } te plakken.
export async function getLocaleForWebhook(): Promise<{
  language: string
  language_code: Locale
}> {
  const locale = await getLocale()
  return { language: LOCALE_ENGLISH_NAMES[locale], language_code: locale }
}

export const LOCALE_COOKIE_NAME = COOKIE_NAME
