'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function excludeContact(
  leadId: string
): Promise<{ success: true } | { error: string }> {
  if (!leadId || leadId.trim().length === 0) {
    return { error: 'Ongeldig contact-ID.' }
  }

  const supabase = await createClient()

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.app_metadata?.client_id) {
    return { error: 'Niet ingelogd.' }
  }

  // Update synced_leads - RLS ensures client can only update own leads
  const { error } = await supabase
    .from('synced_leads')
    .update({ is_excluded: true })
    .eq('id', leadId)

  if (error) {
    return { error: 'Fout bij het verwijderen. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/voorvertoning')
  return { success: true }
}
