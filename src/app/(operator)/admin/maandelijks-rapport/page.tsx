import type { Metadata } from 'next'
import { getClientList } from '@/lib/data/admin-stats'
import { MonthlyReportForm } from './_components/monthly-report-form'

export const metadata: Metadata = { title: 'Maandelijks rapport' }
export const dynamic = 'force-dynamic'

export default async function MaandelijksRapportPage() {
  const clients = await getClientList()
  const clientOptions = clients.map((c) => ({
    id: c.id,
    name: c.companyName,
  }))

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Maandelijks rapport</h2>
        <p className="mt-1 text-sm text-gray-500">
          Kies een klant, vul de campagne-evaluatie in en verstuur het rapport.
          Alle leads binnen de gekozen periode worden automatisch meegestuurd
          (behalve leads met een goedgekeurd bezwaar).
        </p>
      </div>

      <MonthlyReportForm clients={clientOptions} />
    </div>
  )
}
