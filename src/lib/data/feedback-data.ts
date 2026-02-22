import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type FeedbackRequest = {
  id: string
  client_id: string
  user_id: string
  category: 'bug' | 'new_feature' | 'optimization' | 'other'
  title: string
  description: string
  status: 'new' | 'in_progress' | 'thinking' | 'denied' | 'applied'
  operator_response: string | null
  created_at: string
  updated_at: string
}

export type FeedbackWithClient = FeedbackRequest & {
  company_name: string
}

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
