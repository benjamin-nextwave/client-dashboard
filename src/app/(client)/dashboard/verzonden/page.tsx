import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'

export const metadata: Metadata = { title: 'Verzonden' }
export const dynamic = 'force-dynamic'

export default async function VerzondenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Verzonden</h1>

      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-yellow-200 bg-yellow-50 px-6 py-16 text-center">
        <svg className="h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 21h18" />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-yellow-800">Pagina tijdelijk niet beschikbaar</h2>
        <p className="mt-2 max-w-md text-sm text-yellow-700">
          De pagina &quot;Verzonden&quot; is momenteel onder onderhoud. We werken aan verbeteringen en verwachten dat de pagina binnenkort weer beschikbaar is.
        </p>
        <p className="mt-4 text-xs text-yellow-600">
          Onze excuses voor het ongemak.
        </p>
      </div>
    </div>
  )
}
