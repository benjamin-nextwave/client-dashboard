import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  try {
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
  } catch (e) {
    // Re-throw Next.js redirect errors (they use throw internally)
    if (e && typeof e === 'object' && 'digest' in e) {
      throw e
    }
    // For any other error, fall back to login
    redirect('/login')
  }
}
