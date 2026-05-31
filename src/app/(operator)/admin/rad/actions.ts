'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { error?: string }

async function requireOperator(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }
  if (user.app_metadata?.user_role !== 'operator') return { error: 'Geen toegang.' }
  return { userId: user.id }
}

export async function pickWheelClient(clientId: string): Promise<ActionResult> {
  const auth = await requireOperator()
  if ('error' in auth) return { error: auth.error }

  if (!clientId) return { error: 'Geen klant geselecteerd.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('wheel_picks')
    .upsert(
      { client_id: clientId, picked_by: auth.userId, picked_at: new Date().toISOString() },
      { onConflict: 'client_id' }
    )

  if (error) return { error: error.message }

  revalidatePath('/admin/rad')
  return {}
}

export async function resetWheel(): Promise<ActionResult> {
  const auth = await requireOperator()
  if ('error' in auth) return { error: auth.error }

  const admin = createAdminClient()
  // Verwijder alle rows — delete heeft een WHERE-clause nodig met PostgREST.
  const { error } = await admin.from('wheel_picks').delete().not('id', 'is', null)

  if (error) return { error: error.message }

  revalidatePath('/admin/rad')
  return {}
}
