import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const userRole = user.app_metadata?.user_role

  if (userRole === 'operator') {
    redirect('/admin')
  }

  redirect('/dashboard')
}
