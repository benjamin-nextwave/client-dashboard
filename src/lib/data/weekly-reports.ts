import { createAdminClient } from '@/lib/supabase/admin'

export interface WeeklyReport {
  id: string
  clientId: string
  name: string
  filePath: string
  fileUrl: string
  createdAt: string
}

/**
 * Returns all weekly reports for a client, newest first. Used by both the
 * operator manager page and the client's "Terug te vinden" archive section.
 */
export async function getWeeklyReports(clientId: string): Promise<WeeklyReport[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_weekly_reports')
    .select('id, client_id, name, file_path, file_url, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    filePath: row.file_path,
    fileUrl: row.file_url,
    createdAt: row.created_at,
  }))
}
