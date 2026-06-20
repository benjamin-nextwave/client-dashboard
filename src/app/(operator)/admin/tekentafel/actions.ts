'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Sketch = {
  id: string
  clientId: string
  title: string
  templateContent: string
  exampleContent: string
  updatedAt: string
}

type Result<T> = { ok: true; value: T } | { ok: false; error: string }

async function requireOperator(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }
  if (user.app_metadata?.user_role !== 'operator') return { error: 'Geen toegang.' }
  return { userId: user.id }
}

type SketchRow = {
  id: string
  client_id: string
  title: string
  template_content: string
  example_content: string
  updated_at: string
}

function toSketch(row: SketchRow): Sketch {
  return {
    id: row.id,
    clientId: row.client_id,
    title: row.title,
    templateContent: row.template_content,
    exampleContent: row.example_content,
    updatedAt: row.updated_at,
  }
}

const SELECT = 'id, client_id, title, template_content, example_content, updated_at'

export async function createSketch(clientId: string): Promise<Result<Sketch>> {
  const auth = await requireOperator()
  if ('error' in auth) return { ok: false, error: auth.error }
  if (!clientId) return { ok: false, error: 'Geen klant geselecteerd.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('email_sketches')
    .insert({ client_id: clientId })
    .select(SELECT)
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Aanmaken mislukt.' }
  return { ok: true, value: toSketch(data as SketchRow) }
}

export async function updateSketch(
  id: string,
  patch: { title?: string; templateContent?: string; exampleContent?: string }
): Promise<Result<{ updatedAt: string }>> {
  const auth = await requireOperator()
  if ('error' in auth) return { ok: false, error: auth.error }
  if (!id) return { ok: false, error: 'Geen schets geselecteerd.' }

  const fields: Record<string, string> = { updated_at: new Date().toISOString() }
  if (patch.title !== undefined) fields.title = patch.title
  if (patch.templateContent !== undefined) fields.template_content = patch.templateContent
  if (patch.exampleContent !== undefined) fields.example_content = patch.exampleContent

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('email_sketches')
    .update(fields)
    .eq('id', id)
    .select('updated_at')
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? 'Opslaan mislukt.' }
  return { ok: true, value: { updatedAt: (data as { updated_at: string }).updated_at } }
}

export async function deleteSketch(id: string): Promise<Result<true>> {
  const auth = await requireOperator()
  if ('error' in auth) return { ok: false, error: auth.error }
  if (!id) return { ok: false, error: 'Geen schets geselecteerd.' }

  const admin = createAdminClient()
  const { error } = await admin.from('email_sketches').delete().eq('id', id)

  if (error) return { ok: false, error: error.message }
  return { ok: true, value: true }
}
