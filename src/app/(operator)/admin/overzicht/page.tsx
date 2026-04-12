import { getManagementOverview } from '@/lib/data/management-overview'
import { ManagementDashboard } from './_components/management-dashboard'

export const dynamic = 'force-dynamic'

export default async function OverzichtPage() {
  const clients = await getManagementOverview()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">Overzicht</h2>
        <p className="mt-1.5 text-sm text-gray-500">
          Centraal overzicht van alle klanten, hun onboarding-status, openstaande goedkeuringen en deadlines.
        </p>
      </div>

      <ManagementDashboard clients={clients} />
    </div>
  )
}
