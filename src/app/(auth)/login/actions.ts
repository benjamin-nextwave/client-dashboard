'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
