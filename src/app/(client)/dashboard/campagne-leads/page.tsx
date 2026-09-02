import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatEuroCents } from '@/lib/commissions-shared'
import { getClientLeadsOverzicht } from '@/lib/data/client-commission-leads'
import { EmptyState } from '@/components/client/ui/empty-state'
import { getTranslator } from '@/lib/i18n/server'
import { LeadsList } from './_components/leads-list'

export const metadata: Metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function CampagneLeadsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) redirect('/login')

  const [overzicht, t] = await Promise.all([getClientLeadsOverzicht(clientId), getTranslator()])
  const heeftLeads = overzicht.currentLeads.length > 0 || overzicht.earlierLeads.length > 0

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[25px] font-semibold tracking-[-0.03em]">{t('leads.title')}</h1>
        <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
          {t('leads.description')}
        </p>
        {/* Het staat er met opzet bij: de cijfers lopen een dag achter en dat
            moet je weten voordat je ze met je eigen inbox vergelijkt. */}
        <p className="mt-2 text-[12.5px] text-faint">{t('leads.notLiveNotice')}</p>
      </div>

      {!heeftLeads ? (
        <EmptyState
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z"
              />
            </svg>
          }
          title={t('leads.empty')}
          description={t('leads.emptyDescription')}
        />
      ) : (
        <div className="space-y-5">
          <section className="rounded-panel border border-line bg-panel p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[13.5px] font-semibold text-fg">
                  {t('leads.currentPeriod')}
                </h2>
                <p className="mt-0.5 text-[11.5px] text-faint">{overzicht.periodLabel}</p>
              </div>
              <div className="text-right">
                <div className="text-[25px] font-semibold tabular-nums tracking-[-0.03em] text-fg">
                  {formatEuroCents(overzicht.currentTotalCents)}
                </div>
                <p className="mt-0.5 text-[11.5px] text-faint">
                  {overzicht.currentLeadCount === 1
                    ? t('leads.leadCountSingular')
                    : t('leads.leadCount').replace('{count}', String(overzicht.currentLeadCount))}
                </p>
              </div>
            </div>

            {overzicht.currentLeads.length === 0 ? (
              <p className="mt-4 text-[12.5px] text-faint">{t('leads.noneThisPeriod')}</p>
            ) : (
              <div className="mt-3 border-t border-line">
                <LeadsList
                  leads={overzicht.currentLeads}
                  categories={overzicht.categories}
                  bezwaarMogelijk
                />
              </div>
            )}
          </section>

          {overzicht.earlierLeads.length > 0 && (
            <section className="rounded-panel border border-line bg-panel p-5">
              <h2 className="text-[13.5px] font-semibold text-fg">{t('leads.earlierPeriods')}</h2>
              <p className="mt-0.5 text-[11.5px] text-faint">{t('leads.earlierPeriodsHint')}</p>
              <div className="mt-3 border-t border-line">
                <LeadsList
                  leads={overzicht.earlierLeads}
                  categories={overzicht.categories}
                  bezwaarMogelijk={false}
                />
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
