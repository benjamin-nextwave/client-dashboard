import Link from 'next/link'
import { ClientForm } from '@/components/admin/client-form'
import { createClient } from '../actions'

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar overzicht
      </Link>

      <div className="mt-5 mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
          Nieuwe klant
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
          Klant aanmaken
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
          Vul de basisgegevens in, stel branding in en koppel de Instantly workspace. De klant krijgt direct toegang na aanmaken.
        </p>
      </div>

      <ClientForm action={createClient} />
    </div>
  )
}
