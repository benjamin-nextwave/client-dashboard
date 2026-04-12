import { createAdminClient } from '@/lib/supabase/admin'
import { MailClientForm } from './_components/mail-client-form'

export const dynamic = 'force-dynamic'

export default async function MailClientPage() {
  const supabase = createAdminClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name, is_hidden')
    .order('company_name', { ascending: true })

  const clientOptions = (clients ?? [])
    .filter((c) => !c.is_hidden)
    .map((c) => ({ id: c.id, name: c.company_name }))

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Klant mailen</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Selecteer een klant, kies de reden en verstuur een notificatie via e-mail.
        </p>
      </div>

      <MailClientForm clients={clientOptions} />
    </div>
  )
}
