import { createClient } from '@/lib/supabase/server'

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Welkom</h2>
      <p className="mt-2 text-gray-600">
        {user?.email ? `Ingelogd als ${user.email}` : ''}
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Uw dashboard wordt binnenkort beschikbaar
      </p>
    </div>
  )
}
