import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const getClientBranding = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return null

  // Probeer met inbox_url, val terug zonder als de kolom nog niet bestaat
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url, meeting_url, inbox_url, inbox_visible, chat_inbox_visible, onboarding_status')
    .eq('id', clientId)
    .single()

  if (!error) return client

  // Fallback: kolom inbox_url bestaat mogelijk nog niet
  const { data: fallback } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url, meeting_url, onboarding_status')
    .eq('id', clientId)
    .single()

  return fallback ? { ...fallback, inbox_url: null, inbox_visible: false, chat_inbox_visible: true } : null
})
