import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getKixPage } from '@/lib/data/kix'
import { KixEditor } from './_components/kix-editor'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string; pageId: string }>
}

export default async function KixPageDetail({ params }: PageProps) {
  const { clientId, pageId } = await params

  const supabase = createAdminClient()
  const [{ data: client }, page] = await Promise.all([
    supabase.from('clients').select('id, company_name').eq('id', clientId).single(),
    getKixPage(clientId, pageId),
  ])

  if (!client || !page) notFound()

  return (
    <KixEditor
      clientId={clientId}
      companyName={(client as { company_name: string }).company_name}
      page={page}
    />
  )
}
