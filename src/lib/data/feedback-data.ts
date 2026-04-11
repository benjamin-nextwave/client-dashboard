import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FeedbackRequest, FeedbackWithClient } from './feedback-types'

// Re-export types and constants for existing callers
export type {
  FeedbackCategory,
  FeedbackMetadata,
  FeedbackRequest,
  FeedbackWithClient,
  VariantReason,
} from './feedback-types'
export { VARIANT_REASONS, VARIANT_REASON_LABELS } from './feedback-types'

export async function getClientFeedback(clientId: string): Promise<FeedbackRequest[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('feedback_requests')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch client feedback:', error.message)
    return []
  }

  return (data as FeedbackRequest[]) ?? []
}

export async function getAllFeedback(): Promise<FeedbackWithClient[]> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('feedback_requests')
    .select('*, clients!inner(company_name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch all feedback:', error.message)
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as FeedbackRequest),
    company_name: (row.clients as { company_name: string }).company_name,
  }))
}
