import type { CampaignFlow, FlowOutcomeKind } from '@/lib/data/campaign-flow'
import type { MailVariant } from '@/lib/data/campaign'
import { deriveVariantStatus } from '@/lib/data/campaign'
import { getTranslator } from '@/lib/i18n/server'
import { STATUS_COLOR, STATUS_LABEL_KEY } from '../_lib/variant-groups'

const OUTCOME_COLOR: Record<FlowOutcomeKind, string> = {
  success: 'var(--color-pos)',
  continue: 'var(--color-muted)',
  dropoff: 'var(--color-neg)',
}

/**
 * De verbindingslijn is per rij een absoluut segment binnen de markerkolom:
 * `top` net onder de marker, `bottom:-20px` om de rij-padding (pb-5) te
 * overbruggen. Zo volgt de lijn de werkelijke kaarthoogte en stopt hij bij de
 * laatste stap. Eén doorlopende lijn over de hele container eindigt bij de
 * containerrand, ver onder de laatste marker.
 *
 * De markerkolom heeft `self-stretch` nodig: de rij is `items-start`, waardoor
 * de kolom anders op zijn eigen 34px blijft staan en het segment niets heeft om
 * tegen te resolven.
 */
function Connector() {
  return (
    <span
      aria-hidden
      className="absolute w-0.5 rounded-sm bg-line"
      style={{ left: 16, top: 40, bottom: -20 }}
    />
  )
}

export async function CampaignFlowDiagram({
  flow,
  variantsBySubject,
}: {
  flow: CampaignFlow
  /** Statusstipje per flow-variant. Match op onderwerp; er is geen relatie in de data. */
  variantsBySubject: Map<string, MailVariant>
}) {
  const t = await getTranslator()

  return (
    <section className="overflow-hidden rounded-panel border border-line bg-panel">
      <header className="border-b border-line px-5 py-[15px]">
        <h2 className="text-[13.5px] font-semibold tracking-[-0.015em]">{flow.name}</h2>
        <p className="mt-1 text-[11.5px] leading-[1.5] text-muted">
          {t('mailVariantsPage.flowIntro')}
        </p>
      </header>

      <div className="relative flex flex-col px-5 py-5">
        {flow.steps.map((step, i) => {
          const isLast = i === flow.steps.length - 1
          return (
            <div key={step.id} className="relative flex items-start gap-4">
              <div className="relative flex w-[34px] shrink-0 select-none justify-center self-stretch">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-brand text-[13px] font-bold tabular-nums text-white">
                  {step.stepNumber}
                </span>
                {!isLast && <Connector />}
              </div>

              <div className="min-w-0 flex-1 pb-5">
                <div className="overflow-hidden rounded-panel border border-line">
                  <div className="flex items-center gap-3 border-b border-line bg-track px-4 py-[13px]">
                    <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-semibold tracking-[-0.015em]">
                      {step.title}
                    </h3>
                    <span className="shrink-0 text-[11px] tabular-nums text-faint">
                      {step.variants.length === 1
                        ? t('mailVariantsPage.flowVariantOne')
                        : t('flow.variantsCount', { count: step.variants.length })}
                    </span>
                  </div>

                  <div className="grid gap-px bg-line sm:grid-cols-2">
                    {step.variants.map((v) => {
                      const linked = variantsBySubject.get(v.subject)
                      const status = linked ? deriveVariantStatus(linked) : null
                      return (
                        <div key={v.id} className="min-w-0 bg-panel px-4 py-[13px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-faint">
                              {v.label}
                            </span>
                            {status && (
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: STATUS_COLOR[status] }}
                                title={t(STATUS_LABEL_KEY[status])}
                              />
                            )}
                          </div>
                          <div className="mt-[7px] truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                            {v.subject}
                          </div>
                          <div className="mt-[5px] line-clamp-2 text-[11.5px] leading-[1.5] text-muted">
                            {v.body}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {step.outcomes.length > 0 && (
                    <div className="flex flex-wrap gap-2 border-t border-line bg-track px-4 py-3">
                      {step.outcomes.map((o) => (
                        <span
                          key={o.id}
                          className="inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border bg-panel px-2.5 py-[5px] text-[11.5px] font-medium"
                          style={{
                            borderColor:
                              o.kind === 'continue'
                                ? 'var(--color-line)'
                                : `color-mix(in oklab, ${OUTCOME_COLOR[o.kind]} 30%, var(--color-line))`,
                            color:
                              o.kind === 'continue' ? 'var(--color-muted)' : OUTCOME_COLOR[o.kind],
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: OUTCOME_COLOR[o.kind] }}
                          />
                          {o.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
