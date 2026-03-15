'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface JobTitleEntry {
  title: string
  percentage: number
}

export interface IndustryEntry {
  name: string
  percentage: number
}

export interface LocationEntry {
  name: string
  percentage: number
}

export interface PreviewSettings {
  id: string
  client_id: string
  contact_count: number | null
  job_titles: JobTitleEntry[]
  industries: IndustryEntry[]
  locations: LocationEntry[]
  launch_date: string | null
}

export async function getPreviewSettings(clientId: string): Promise<PreviewSettings | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('preview_settings')
    .select('*')
    .eq('client_id', clientId)
    .single()

  return data ?? null
}

export async function savePreviewSettings(
  clientId: string,
  settings: {
    contact_count: number | null
    job_titles: JobTitleEntry[]
    industries: IndustryEntry[]
    locations: LocationEntry[]
    launch_date: string | null
  }
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('preview_settings')
    .upsert(
      {
        client_id: clientId,
        contact_count: settings.contact_count,
        job_titles: settings.job_titles,
        industries: settings.industries,
        locations: settings.locations,
        launch_date: settings.launch_date,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id' }
    )

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard/voorvertoning')
  return {}
}
