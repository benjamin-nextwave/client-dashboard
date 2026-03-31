import Link from 'next/link'
import { ClientForm } from '@/components/admin/client-form'
import { createClient } from '../actions'

export default async function NewClientPage() {
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

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <ClientForm action={createClient} />
      </div>
    </div>
  )
}
