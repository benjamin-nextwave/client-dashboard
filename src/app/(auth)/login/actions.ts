'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const WEBHOOK_PASSWORD_HELP = 'https://hook.eu2.make.com/38p6m3y88ok5rtcrv6nfpurysgywlkuw'

export async function requestPasswordHelp(email: string): Promise<{ error?: string; email?: string }> {
  if (!email || !email.includes('@')) {
    return { error: 'Vul eerst je e-mailadres in.' }
  }

  const supabase = await createClient()

  // Check if this email exists as a client user
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const user = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    return { error: 'Dit e-mailadres is niet bij ons bekend.' }
  }

  try {
    const res = await fetch(WEBHOOK_PASSWORD_HELP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'password_help_requested',
        email: user.email,
        user_id: user.id,
        timestamp: new Date().toISOString(),
      }),
    })
    if (!res.ok) return { error: 'Er ging iets mis. Probeer het later opnieuw.' }
  } catch {
    return { error: 'Er ging iets mis. Probeer het later opnieuw.' }
  }

  return { email: user.email ?? email }
}

export async function login(
  _prevState: { error: string },
  formData: FormData
) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  const userRole = data.user.app_metadata?.user_role

  if (userRole === 'operator') {
    revalidatePath('/admin', 'layout')
    redirect('/admin')
  }

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
