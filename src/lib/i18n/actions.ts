'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocale } from './index'
import { LOCALE_COOKIE_NAME } from './server'

export async function setLocale(locale: string): Promise<{ error?: string }> {
  if (!isLocale(locale)) return { error: 'Onbekende taal' }

  // Cookie 1 jaar geldig — pad / zodat hele app het ziet
  const cookieStore = await cookies()
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  // Sync naar profiles als ingelogd
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      await admin.from('profiles').update({ language: locale }).eq('id', user.id)
    }
  } catch {
    // ignore — cookie is altijd gezet, dat is voldoende voor render
  }

  revalidatePath('/', 'layout')
  return {}
}
