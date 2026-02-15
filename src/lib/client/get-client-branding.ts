import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const getClientBranding = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return null

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  return client
})
