'use client'

import { useState } from 'react'
import { formatEuroCents } from '@/lib/commissions-shared'
import type {
  ClientCommissionLead,
  CommissionCategoryOption,
} from '@/lib/data/client-commission-leads'
import { useT } from '@/lib/i18n/client'
import { ObjectionModal } from './objection-modal'

/**
 * De leadlijst zoals de klant hem ziet: één regel per lead die in rekening
 * wordt gebracht, met de categorie, het bedrag en — als we hem konden vinden —
 * de reactie van de lead erbij. Die reactie staat er zodat bezwaar maken niet
 * uit het hoofd hoeft.
 */

function nlDatum(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(
    new Date(Date.UTC(y, m - 1, d))
  )
}

export function LeadsList({
  leads,
  categories,
  bezwaarMogelijk,
}: {
  leads: ClientCommissionLead[]
  categories: CommissionCategoryOption[]
  bezwaarMogelijk: boolean
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [bezwaarVoor, setBezwaarVoor] = useState<ClientCommissionLead | null>(null)
  const t = useT()

  return (
    <>
      <ul className="divide-y divide-line">
        {leads.map((lead) => {
          const uitgeklapt = open === lead.id
          return (
            <li key={lead.id} className="py-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="w-[52px] shrink-0 text-[11.5px] tabular-nums text-faint">
                  {nlDatum(lead.entryDate)}
                </span>

                <span className="min-w-0 flex-1 truncate text-[12.5px] text-fg">
                  {lead.leadEmail}
                </span>

                <span className="text-[11.5px] text-muted">{lead.categoryName}</span>

                <span
                  className={`w-[76px] shrink-0 text-right text-[12.5px] tabular-nums ${
                    lead.isRejected ? 'text-faint line-through' : 'text-fg'
                  }`}
                >
                  {formatEuroCents(lead.amountCents)}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[64px]">
                {lead.isHalfPrice && (
                  <span className="text-[11.5px] text-warn">{t('leads.halfPrice')}</span>
                )}
                {lead.isRejected && (
                  <span className="text-[11.5px] text-faint">{t('leads.notBilled')}</span>
                )}

                {(lead.replyBody || lead.replySubject) && (
                  <button
                    type="button"
                    onClick={() => setOpen(uitgeklapt ? null : lead.id)}
                    className="text-[11.5px] text-muted underline-offset-2 hover:text-fg hover:underline"
                  >
                    {uitgeklapt ? t('leads.hideReply') : t('leads.showReply')}
                  </button>
                )}

                {lead.objection ? (
                  <ObjectionBadge objection={lead.objection} />
                ) : (
                  bezwaarMogelijk &&
                  !lead.isRejected && (
                    <button
                      type="button"
                      onClick={() => setBezwaarVoor(lead)}
                      className="text-[11.5px] text-muted underline-offset-2 hover:text-fg hover:underline"
                    >
                      {t('leads.submitObjection')}
                    </button>
                  )
                )}
              </div>

              {uitgeklapt && (
                <div className="mt-2 ml-[64px] rounded-control border border-line bg-canvas p-3">
                  {lead.replySubject && (
                    <p className="text-[11.5px] font-medium text-fg">{lead.replySubject}</p>
                  )}
                  {lead.replyBody ? (
                    <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-[1.55] text-muted">
                      {lead.replyBody}
                    </p>
                  ) : (
                    <p className="mt-1 text-[12.5px] text-faint">{t('leads.replyEmpty')}</p>
                  )}
                </div>
              )}

              {lead.objection && (
                <div className="mt-2 ml-[64px] rounded-control border border-line bg-canvas p-3">
                  <p className="text-[11.5px] text-muted">
                    {t('leads.objectionProposed')}{' '}
                    <span className="font-medium text-fg">
                      {lead.objection.proposedCategoryName}
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-[1.55] text-muted">
                    {lead.objection.reason}
                  </p>
                  {lead.objection.response && (
                    <p className="mt-2 border-t border-line pt-2 text-[12.5px] leading-[1.55] text-fg">
                      {lead.objection.response}
                    </p>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {bezwaarVoor && (
        <ObjectionModal
          lead={bezwaarVoor}
          categories={categories}
          onClose={() => setBezwaarVoor(null)}
        />
      )}
    </>
  )
}

function ObjectionBadge({ objection }: { objection: NonNullable<ClientCommissionLead['objection']> }) {
  const t = useT()
  const tekst =
    objection.status === 'pending'
      ? t('leads.objectionPending')
      : objection.status === 'approved'
        ? t('leads.objectionApproved')
        : t('leads.objectionRejected')

  const kleur =
    objection.status === 'pending'
      ? 'text-warn'
      : objection.status === 'approved'
        ? 'text-pos'
        : 'text-neg'

  return <span className={`text-[11.5px] ${kleur}`}>{tekst}</span>
}
