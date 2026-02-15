import { createClient } from '@/lib/supabase/server'

export default async function OperatorDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Operator Dashboard</h2>
      <p className="mt-2 text-gray-600">
        Welkom{user?.email ? `, ${user.email}` : ''}
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Client management coming in Phase 2
      </p>
    </div>
  )
}
