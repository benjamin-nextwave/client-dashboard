'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function excludeContact(
  contactId: string
): Promise<{ success: true } | { error: string }> {
  if (!contactId || contactId.trim().length === 0) {
    return { error: 'Ongeldig contact-ID.' }
  }

  // Auth check — get the client_id from the logged-in user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.app_metadata?.client_id) {
    return { error: 'Niet ingelogd.' }
  }

  const clientId = user.app_metadata.client_id as string
  const admin = createAdminClient()

  // Verify the csv_row belongs to an upload owned by this client
  const { data: row, error: rowError } = await admin
    .from('csv_rows')
    .select('id, upload_id')
    .eq('id', contactId)
    .single()

  if (rowError || !row) {
    return { error: 'Contact niet gevonden.' }
  }

  const { data: upload, error: uploadError } = await admin
    .from('csv_uploads')
    .select('client_id')
    .eq('id', row.upload_id)
    .single()

  if (uploadError || !upload || upload.client_id !== clientId) {
    return { error: 'Geen toegang tot dit contact.' }
  }

  // Mark the row as filtered with client_excluded reason
  const { error } = await admin
    .from('csv_rows')
    .update({ is_filtered: true, filter_reason: 'client_excluded' })
    .eq('id', contactId)

  if (error) {
    return { error: 'Fout bij het verwijderen. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/voorvertoning')
  return { success: true }
}
