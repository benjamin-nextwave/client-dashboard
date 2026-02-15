import { createAdminClient } from '@/lib/supabase/admin'

export interface LogErrorInput {
  clientId: string
  errorType: 'api_failure' | 'import_error' | 'sync_error'
  message: string
  details?: Record<string, unknown>
}

/**
 * Log an error to the error_logs table via admin client.
 * Never throws -- if logging itself fails, it silently console.errors.
 * Always awaited (not fire-and-forget) for serverless safety.
 */
export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase.from('error_logs').insert({
      client_id: input.clientId,
      error_type: input.errorType,
      message: input.message,
      details: input.details ?? null,
    })
  } catch (err) {
    console.error('Failed to log error to error_logs table:', err)
  }
}
