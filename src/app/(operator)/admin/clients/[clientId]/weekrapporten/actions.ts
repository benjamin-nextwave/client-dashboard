'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadWeeklyReport, deleteWeeklyReportFile } from '@/lib/supabase/storage'

function paths(clientId: string) {
  return [
    `/admin/clients/${clientId}/weekrapporten`,
    `/dashboard/mijn-campagne`,
  ]
}

/**
 * Derives a friendly display name from the uploaded filename: strips the
 * .pdf extension, falls back to "Weekrapport" for empty names.
 */
function deriveName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').trim()
  return base.length > 0 ? base.slice(0, 200) : 'Weekrapport'
}

export async function uploadWeeklyReportAction(
  clientId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const file = formData.get('pdf') as File | null
  if (!file || file.size === 0) return { error: 'Geen bestand geselecteerd' }

  const result = await uploadWeeklyReport(clientId, file)
  if ('error' in result) return { error: result.error }

  const supabase = createAdminClient()
  const { error } = await supabase.from('client_weekly_reports').insert({
    client_id: clientId,
    name: deriveName(file.name),
    file_path: result.path,
    file_url: result.url,
  })

  if (error) {
    // Roll back the orphaned upload so storage doesn't drift from the table.
    await deleteWeeklyReportFile(result.path)
    return { error: error.message }
  }

  for (const p of paths(clientId)) revalidatePath(p)
  return {}
}

export async function renameWeeklyReportAction(
  reportId: string,
  clientId: string,
  name: string
): Promise<{ error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Naam mag niet leeg zijn' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_weekly_reports')
    .update({ name: trimmed.slice(0, 200), updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  for (const p of paths(clientId)) revalidatePath(p)
  return {}
}

export async function deleteWeeklyReportAction(
  reportId: string,
  clientId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: row, error: fetchError } = await supabase
    .from('client_weekly_reports')
    .select('file_path')
    .eq('id', reportId)
    .eq('client_id', clientId)
    .single()

  if (fetchError || !row) return { error: 'Weekrapport niet gevonden' }

  const { error } = await supabase
    .from('client_weekly_reports')
    .delete()
    .eq('id', reportId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  await deleteWeeklyReportFile(row.file_path as string)

  for (const p of paths(clientId)) revalidatePath(p)
  return {}
}
