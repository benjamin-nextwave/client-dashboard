'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

export const TARGET_AUDIENCE_LISTS = [
  'sectors_included',
  'sectors_excluded',
  'keywords',
  'locations',
  'job_titles',
] as const

export type TargetAudienceList = (typeof TARGET_AUDIENCE_LISTS)[number]

export interface TargetAudience {
  sectorsIncluded: string[]
  sectorsExcluded: string[]
  keywords: string[]
  locations: string[]
  jobTitles: string[]
  notes: string
}

function adminPath(clientId: string) {
  return `/admin/clients/${clientId}/doelgroep`
}

export async function updateTargetAudienceList(
  clientId: string,
  list: TargetAudienceList,
  values: string[]
): Promise<{ error?: string }> {
  if (!TARGET_AUDIENCE_LISTS.includes(list)) {
    return { error: 'Onbekend veld.' }
  }

  const cleaned = values
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
    .slice(0, 300)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_target_audience')
    .upsert(
      { client_id: clientId, [list]: cleaned, updated_at: new Date().toISOString() },
      { onConflict: 'client_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(adminPath(clientId))
  return {}
}

export async function updateTargetAudienceNotes(
  clientId: string,
  notes: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_target_audience')
    .upsert(
      { client_id: clientId, notes, updated_at: new Date().toISOString() },
      { onConflict: 'client_id' }
    )

  if (error) return { error: error.message }

  revalidatePath(adminPath(clientId))
  return {}
}
