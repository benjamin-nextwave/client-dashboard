import Link from 'next/link'
import type { Lead } from '../_lib/types'
import { CLASSIFICATION_BADGE, CLASSIFICATION_LABEL } from '../_lib/labels'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LeadTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
        <h3 className="text-base font-semibold text-gray-900">Nog geen leads</h3>
        <p className="mt-1 text-sm text-gray-600">
          Zodra Make replies vanuit Instantly synchroniseert, verschijnen ze hier.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
          <tr>
            <th className="px-4 py-3">Naam</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Ontvangen</th>
            <th className="px-4 py-3">Classificatie</th>
            <th className="px-4 py-3">Sending account</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/dashboard/lead-inbox/${lead.id}`}
                  className="font-medium text-gray-900 hover:underline"
                >
                  {lead.name || '—'}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-700">{lead.email}</td>
              <td className="px-4 py-3 text-gray-700">
                {formatDateTime(lead.last_reply_at)}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE[lead.classification]}`}
                >
                  {CLASSIFICATION_LABEL[lead.classification]}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-700">{lead.sending_account}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
