'use server'

import { createClient } from '@/lib/supabase/server'
import { getLocaleForWebhook } from '@/lib/i18n/server'

const WEBHOOK_PASSWORD_HELP = 'https://hook.eu2.make.com/38p6m3y88ok5rtcrv6nfpurysgywlkuw'

export async function requestInboxPasswordHelp(): Promise<{ error?: string; email?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { error: 'Je bent niet ingelogd.' }
  }

  const localeInfo = await getLocaleForWebhook()

  try {
    const res = await fetch(WEBHOOK_PASSWORD_HELP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'inbox_password_help_requested',
        email: user.email,
        user_id: user.id,
        client_id: user.app_metadata?.client_id ?? null,
        ...localeInfo,
        timestamp: new Date().toISOString(),
      }),
    })
    if (!res.ok) return { error: 'Er ging iets mis. Probeer het later opnieuw.' }
  } catch {
    return { error: 'Er ging iets mis. Probeer het later opnieuw.' }
  }

  return { email: user.email }
}
