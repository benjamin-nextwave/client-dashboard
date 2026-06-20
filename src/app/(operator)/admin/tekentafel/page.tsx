import { createAdminClient } from '@/lib/supabase/admin'
import { Tekentafel, type SketchClient } from './_components/tekentafel'
import type { Sketch } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'De tekentafel' }

export default async function TekentafelPage() {
  const admin = createAdminClient()

  const [{ data: clientsData }, { data: sketchesData }] = await Promise.all([
    admin
      .from('clients')
      .select('id, company_name, primary_color, logo_url, is_hidden')
      .order('company_name', { ascending: true }),
    admin
      .from('email_sketches')
      .select('id, client_id, title, template_content, example_content, updated_at')
      .order('updated_at', { ascending: false }),
  ])

  const clients: SketchClient[] = (clientsData ?? [])
    .filter((c) => !c.is_hidden)
    .map((c) => ({
      id: c.id as string,
      name: (c.company_name as string) ?? '',
      color: (c.primary_color as string | null) ?? null,
      logo: (c.logo_url as string | null) ?? null,
    }))

  const sketches: Sketch[] = (sketchesData ?? []).map((s) => ({
    id: s.id as string,
    clientId: s.client_id as string,
    title: (s.title as string) ?? '',
    templateContent: (s.template_content as string) ?? '',
    exampleContent: (s.example_content as string) ?? '',
    updatedAt: s.updated_at as string,
  }))

  return <Tekentafel clients={clients} initialSketches={sketches} />
}
