import { createAdminClient } from '@/lib/supabase/admin'

export type ErrorLog = {
  id: string
  client_id: string
  error_type: 'api_failure' | 'import_error' | 'sync_error'
  message: string
  details: Record<string, unknown> | null
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  clients: { company_name: string } | null
}

/**
 * Fetch error logs with client company name, ordered by most recent first.
 * Uses admin client since this is operator-only.
 */
export async function getErrorLogs(): Promise<ErrorLog[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('error_logs')
    .select('*, clients(company_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('Failed to fetch error logs:', error.message)
    return []
  }

  return (data ?? []) as ErrorLog[]
}
