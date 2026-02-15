import Link from 'next/link'
import { listCampaigns } from '@/lib/instantly/client'
import { ClientForm } from '@/components/admin/client-form'
import { createClient } from '../actions'

export default async function NewClientPage() {
  let campaigns: { id: string; name: string }[] = []
  let campaignWarning: string | null = null

  try {
    if (!process.env.INSTANTLY_API_KEY) {
      campaignWarning = 'INSTANTLY_API_KEY is niet geconfigureerd. Campagnes kunnen niet worden opgehaald.'
    } else {
      const result = await listCampaigns({ limit: 100 })
      campaigns = result.items.map((c) => ({ id: c.id, name: c.name }))
    }
  } catch (err) {
    campaignWarning = 'Campagnes konden niet worden opgehaald van Instantly.'
    console.warn('Failed to fetch campaigns:', err)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Terug naar overzicht
        </Link>
      </div>

      <h2 className="mb-6 text-2xl font-bold text-gray-900">
        Nieuwe klant aanmaken
      </h2>

      {campaignWarning && (
        <div className="mb-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          {campaignWarning}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <ClientForm action={createClient} campaigns={campaigns} />
      </div>
    </div>
  )
}
