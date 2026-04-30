'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LABEL_META, type CampaignLead, type WeekGroup } from '@/lib/data/campaign-leads'
import { deleteCampaignLead } from '@/lib/actions/campaign-leads-actions'
import { LeadFormDialog } from './lead-form-dialog'

interface Props {
  clientId: string
  weekGroups: WeekGroup[]
}

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export function LeadsTable({ clientId, weekGroups }: Props) {
  return (
    <div className="space-y-8">
      {weekGroups.map((group) => (
        <WeekBlock key={group.key} clientId={clientId} group={group} />
      ))}
    </div>
  )
}

function WeekBlock({ clientId, group }: { clientId: string; group: WeekGroup }) {
  const start = new Date(group.startDate)
  const end = new Date(group.endDate)
  const fmt = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Week {group.weekNumber} · {fmt.format(start)} – {fmt.format(end)} {group.year}
        </h2>
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400">
          {group.leads.length} {group.leads.length === 1 ? 'lead' : 'leads'}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Reactie</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {group.leads.map((lead) => (
              <LeadRow key={lead.id} clientId={clientId} lead={lead} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LeadRow({ clientId, lead }: { clientId: string; lead: CampaignLead }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const meta = LABEL_META[lead.label]

  const handleDelete = () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteCampaignLead({ id: lead.id, clientId })
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <tr className="transition-colors hover:bg-gray-50/60">
      <td className="px-4 py-3 align-top text-xs text-gray-500">
        {DATE_FMT.format(new Date(lead.receivedAt))}
      </td>
      <td className="px-4 py-3 align-top">
        <p className="font-medium text-gray-900">
          {lead.leadName ?? lead.leadEmail}
        </p>
        {lead.leadName && (
          <p className="mt-0.5 text-xs text-gray-500">{lead.leadEmail}</p>
        )}
        {lead.leadCompany && (
          <p className="mt-0.5 text-xs text-gray-400">{lead.leadCompany}</p>
        )}
      </td>
      <td className="max-w-md px-4 py-3 align-top">
        {lead.replySubject ? (
          <p className="line-clamp-2 text-xs text-gray-700">
            <span className="font-medium">{lead.replySubject}</span>
            {lead.replyBody && (
              <span className="text-gray-500"> — {lead.replyBody}</span>
            )}
          </p>
        ) : lead.replyBody ? (
          <p className="line-clamp-2 text-xs text-gray-700">{lead.replyBody}</p>
        ) : (
          <span className="text-xs italic text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col items-start gap-1">
          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.short}
          </span>
          {lead.objectionStatus && (
            <span
              className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                lead.objectionStatus === 'pending'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : lead.objectionStatus === 'approved'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {lead.objectionStatus === 'pending'
                ? 'Bezwaar open'
                : lead.objectionStatus === 'approved'
                  ? 'Bezwaar goedgekeurd'
                  : 'Bezwaar afgekeurd'}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-right">
        <div className="inline-flex items-center gap-2">
          <LeadFormDialog
            clientId={clientId}
            mode="edit"
            lead={lead}
            trigger={
              <span className="rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700">
                Bewerken
              </span>
            }
          />
          {confirming ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {pending ? 'Bezig…' : 'Bevestig'}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100"
              >
                Annuleer
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Verwijder
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  )
}
