'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function resolveError(
  errorId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Niet ingelogd.' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('error_logs')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', errorId)

  if (error) {
    return { error: `Fout oplossen mislukt: ${error.message}` }
  }

  revalidatePath('/admin/errors')
  return { success: true }
}
