'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CampaignFlow,
  CampaignFlowOutcome,
  CampaignFlowStep,
  CampaignFlowVariant,
  FlowOutcomeKind,
} from '@/lib/data/campaign-flow'
import type { MailVariantStatus } from '@/lib/data/campaign'
import type { LinkedInFlowState } from '@/lib/data/linkedin-flow'
import { useT } from '@/lib/i18n/client'
import { STATUS_COLOR, STATUS_LABEL_KEY } from '../_lib/variant-groups'
import { displayOutcomeLabel } from '../../mijn-campagne/_components/flow-outcome-label'
import { LinkedInFlowBlock } from '../../mijn-campagne/_components/linkedin-flow-block'

/** Bron-tokens, niet --color-*: die bestaan alleen binnen @theme inline. */
const OUTCOME_COLOR: Record<FlowOutcomeKind, string> = {
  success: 'var(--c-pos)',
  continue: 'var(--c-muted)',
  dropoff: 'var(--c-neg)',
}

/**
 * Alleen varianten die echt van elkaar verschillen.
 *
 * De flow-editor legt per stap net zoveel variantrijen aan als de openingsmail
 * er heeft, ook als de opvolgmail voor iedereen dezelfde tekst is — dan staan
 * er vier rijen met hetzelfde onderwerp en dezelfde body, en verschilt alleen
 * het ingevulde voorbeeld. Vier keuzeknoppen die naar dezelfde mail wijzen
 * suggereren varianten die er niet zijn, dus vergelijken we op onderwerp +
 * tekst en houden we per unieke mail de eerste over.
 */
function uniqueVariants(step: CampaignFlowStep): CampaignFlowVariant[] {
  const seen = new Set<string>()
  const out: CampaignFlowVariant[] = []
  for (const v of step.variants) {
    const key = `${v.subject.trim()}\n${v.body.trim()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
  }
  return out
}

interface Props {
  flows: CampaignFlow[]
  linkedInByFlow: Record<string, LinkedInFlowState>
  /** Status per flow-variant, op de server afgeleid uit de mailvarianten. */
  statusByVariantId: Record<string, MailVariantStatus>
}

export function CampaignFlowExplorer({ flows, linkedInByFlow, statusByVariantId }: Props) {
  const t = useT()

  const [flowIndex, setFlowIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [variantIndex, setVariantIndex] = useState(0)
  const [showExample, setShowExample] = useState(false)

  const flow = flows[Math.min(flowIndex, flows.length - 1)]
  const steps = useMemo(() => flow?.steps ?? [], [flow])

  // Eén keer per campagne, zodat de rail en de variantkiezer nooit een ander
  // aantal laten zien.
  const variantsByStep = useMemo(() => {
    const map = new Map<string, CampaignFlowVariant[]>()
    for (const s of steps) map.set(s.id, uniqueVariants(s))
    return map
  }, [steps])

  const step: CampaignFlowStep | undefined = steps[Math.min(stepIndex, steps.length - 1)]
  const variants = (step && variantsByStep.get(step.id)) ?? []
  const variant = variants[Math.min(variantIndex, variants.length - 1)]

  const activePillRef = useRef<HTMLButtonElement | null>(null)

  // De gekozen campagne moet in beeld staan, ook als hij buiten de rail valt.
  useEffect(() => {
    activePillRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [flowIndex])

  function selectFlow(i: number) {
    setFlowIndex(i)
    setStepIndex(0)
    setVariantIndex(0)
    setShowExample(false)
  }

  function selectStep(i: number) {
    setStepIndex(i)
    setVariantIndex(0)
    setShowExample(false)
  }

  const linkedIn = flow ? linkedInByFlow[flow.id] : undefined
  const hasExample = !!variant && variant.exampleBody.trim().length > 0
  const bodyText = variant
    ? showExample && hasExample
      ? variant.exampleBody
      : variant.body
    : ''

  // "Geen reactie" wijst naar de volgende mail; op de laatste stap eindigt het.
  const nextStep = steps[stepIndex + 1]

  const outcomes = useMemo(() => {
    if (!step) return []
    const order: FlowOutcomeKind[] = ['continue', 'success', 'dropoff']
    return [...step.outcomes].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
  }, [step])

  if (!flow) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Campagnekiezer: blijft bovenin plakken terwijl je door een lange mail
          scrollt, zodat je nooit hoeft te raden naar welke campagne je kijkt.
          De scrollcontainer is <main> in de client-layout. */}
      <div className="sticky top-0 z-10 -mt-2 bg-canvas pb-1 pt-2">
        <div className="rounded-panel border border-line bg-panel px-4 py-3">
          <div className="mb-[9px] flex items-center justify-between gap-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
              {t('mailVariantsPage.flowCampaignEyebrow')}
            </span>
            {flows.length > 1 && (
              <span className="text-[11.5px] tabular-nums text-faint">
                {t('mailVariantsPage.flowCampaignCount', {
                  current: flowIndex + 1,
                  total: flows.length,
                })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {flows.length > 1 && (
              <ArrowButton
                direction="prev"
                label={t('mailVariantsPage.flowPrevCampaign')}
                disabled={flowIndex === 0}
                onClick={() => selectFlow(flowIndex - 1)}
              />
            )}

            <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto rounded-[9px] border border-line bg-track p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {flows.map((f, i) => {
                const active = i === flowIndex
                return (
                  <button
                    key={f.id}
                    ref={active ? activePillRef : undefined}
                    type="button"
                    onClick={() => selectFlow(i)}
                    aria-current={active ? 'true' : undefined}
                    className={`flex shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[7px] px-[13px] py-[7px] text-[12.5px] transition-colors ${
                      active
                        ? 'border border-line bg-panel font-semibold'
                        : 'border border-transparent font-medium text-muted hover:bg-[var(--brand-05)]'
                    }`}
                  >
                    <span
                      className="h-[7px] w-[7px] shrink-0 rounded-full"
                      style={{ background: active ? 'var(--brand-color)' : 'var(--c-faint)' }}
                    />
                    {f.name}
                  </button>
                )
              })}
            </div>

            {flows.length > 1 && (
              <ArrowButton
                direction="next"
                label={t('mailVariantsPage.flowNextCampaign')}
                disabled={flowIndex === flows.length - 1}
                onClick={() => selectFlow(flowIndex + 1)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <section className="overflow-hidden rounded-panel border border-line bg-panel">
          <header className="border-b border-line px-5 py-[15px]">
            <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{flow.name}</h2>
            <p className="mt-1 text-[11.5px] leading-[1.5] text-muted">
              {t('mailVariantsPage.flowIntro')}
            </p>
          </header>

          {/* De mails als één rij: hier zie je de flow in één oogopslag. */}
          <div className="flex gap-2 overflow-x-auto border-b border-line bg-track px-5 py-4">
            {steps.map((s, i) => {
              const active = i === stepIndex
              const count = variantsByStep.get(s.id)?.length ?? 0
              return (
                <div key={s.id} className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectStep(i)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex w-[188px] shrink-0 items-start gap-[10px] rounded-control border px-3 py-[10px] text-left transition-colors ${
                      active
                        ? 'border-[var(--brand-40)] bg-[var(--brand-08)]'
                        : 'border-line bg-panel hover:bg-[var(--brand-04)]'
                    }`}
                  >
                    <span
                      className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] text-[12px] font-bold tabular-nums ${
                        active ? 'bg-brand text-white' : 'bg-track text-muted'
                      }`}
                    >
                      {s.stepNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          active ? 'text-brand-ink' : 'text-faint'
                        }`}
                      >
                        {t('mailVariantsPage.flowMailStep', { number: s.stepNumber })}
                      </span>
                      <span className="mt-[3px] block truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                        {s.title || t('mailVariantsPage.flowStepUnnamed')}
                      </span>
                      <span className="mt-[3px] block text-[11px] tabular-nums text-faint">
                        {count === 1
                          ? t('mailVariantsPage.flowVariantOne')
                          : t('flow.variantsCount', { count })}
                      </span>
                    </span>
                  </button>

                  {i < steps.length - 1 && (
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      className="h-3.5 w-3.5 shrink-0 text-faint"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                    </svg>
                  )}
                </div>
              )
            })}
          </div>

          {/* De gekozen mail, voluit. */}
          {step && (
            <div className="px-5 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                    {t('mailVariantsPage.flowStepCounter', {
                      current: stepIndex + 1,
                      total: steps.length,
                    })}
                  </div>
                  <h3 className="mt-[5px] text-[15px] font-semibold tracking-[-0.02em]">
                    {step.title || t('mailVariantsPage.flowStepUnnamed')}
                  </h3>
                </div>

                {hasExample && (
                  <div className="flex shrink-0 gap-0.5 rounded-[9px] border border-line bg-track p-[3px]">
                    {[
                      { label: t('mailVariantsPage.viewTemplate'), example: false },
                      { label: t('mailVariantsPage.viewExample'), example: true },
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setShowExample(opt.example)}
                        className={`whitespace-nowrap rounded-[7px] px-[11px] py-[5px] text-[11.5px] font-semibold transition-colors ${
                          showExample === opt.example
                            ? 'border border-line bg-panel'
                            : 'border border-transparent text-muted'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {variants.length === 0 ? (
                <p className="mt-4 rounded-control border border-line bg-track px-4 py-3 text-[12.5px] text-muted">
                  {t('mailVariantsPage.flowNoVariants')}
                </p>
              ) : (
                <>
                  {variants.length > 1 && (
                    <div className="mt-4">
                      <div className="mb-[7px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                        {t('mailVariantsPage.flowVariantPicker')}
                      </div>
                      <div className="flex flex-wrap gap-0.5 rounded-[9px] border border-line bg-track p-[3px]">
                        {variants.map((v, i) => {
                          const active = i === variantIndex
                          const status = statusByVariantId[v.id]
                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => {
                                setVariantIndex(i)
                                setShowExample(false)
                              }}
                              aria-current={active ? 'true' : undefined}
                              className={`flex items-center gap-[7px] whitespace-nowrap rounded-[7px] px-[13px] py-[6px] text-[12.5px] transition-colors ${
                                active
                                  ? 'border border-line bg-panel font-semibold'
                                  : 'border border-transparent font-medium text-muted hover:bg-[var(--brand-05)]'
                              }`}
                            >
                              {v.label}
                              {status && (
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: STATUS_COLOR[status] }}
                                  title={t(STATUS_LABEL_KEY[status])}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {variant && (
                    <div className="mt-4 overflow-hidden rounded-panel border border-line">
                      <div className="border-b border-line bg-track px-4 py-[11px]">
                        <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                          {t('flow.subject')}
                        </div>
                        <div className="mt-[5px] text-[13.5px] font-semibold tracking-[-0.015em]">
                          {variant.subject || t('mailVariantsPage.flowNoSubject')}
                        </div>
                      </div>
                      <div className="px-4 py-4">
                        <div className="mb-[9px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                          {t('flow.mailBody')}
                        </div>
                        {bodyText.trim().length > 0 ? (
                          <div className="whitespace-pre-wrap text-[12.5px] leading-[1.7]">
                            {bodyText}
                          </div>
                        ) : (
                          <p className="text-[12.5px] text-muted">{t('flow.noMailContent')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Wat er na deze mail met de lead gebeurt. */}
              {outcomes.length > 0 && (
                <div className="mt-5">
                  <div className="mb-[9px] text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
                    {t('mailVariantsPage.flowWhatNext')}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {outcomes.map((o) => (
                      <OutcomeCard
                        key={o.id}
                        outcome={o}
                        nextLabel={
                          o.kind === 'continue'
                            ? nextStep
                              ? t('mailVariantsPage.flowNextMail', { number: nextStep.stepNumber })
                              : t('flow.endOfCampaign')
                            : null
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {linkedIn && <LinkedInFlowBlock state={linkedIn} />}
      </div>
    </div>
  )
}

function ArrowButton({
  direction,
  label,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next'
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-control border border-line bg-panel text-muted transition-colors hover:bg-[var(--brand-05)] disabled:opacity-35 disabled:hover:bg-panel"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direction === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}

function OutcomeCard({
  outcome,
  nextLabel,
}: {
  outcome: CampaignFlowOutcome
  /** Alleen bij 'continue': waar de lead heen gaat als hij niet reageert. */
  nextLabel: string | null
}) {
  const t = useT()
  const color = OUTCOME_COLOR[outcome.kind]
  const responsibility =
    outcome.responsibility === 'client'
      ? t('flow.byYou')
      : outcome.responsibility === 'nextwave'
        ? t('flow.byNextwave')
        : null

  return (
    <div
      className="rounded-control border bg-panel px-3.5 py-3"
      style={{
        borderColor:
          outcome.kind === 'continue'
            ? 'var(--c-line)'
            : `color-mix(in oklab, ${color} 30%, var(--c-line))`,
      }}
    >
      <div className="flex items-center gap-[7px]">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
        <span
          className="text-[12.5px] font-semibold tracking-[-0.01em]"
          style={{ color: outcome.kind === 'continue' ? undefined : color }}
        >
          {displayOutcomeLabel(outcome, t)}
        </span>
      </div>

      {nextLabel && <div className="mt-[7px] text-[11.5px] text-muted">{nextLabel}</div>}

      {responsibility && (
        <div className="mt-[7px] inline-flex items-center rounded-full border border-line bg-track px-2 py-[3px] text-[10.5px] font-medium text-muted">
          {responsibility}
        </div>
      )}

      {outcome.dropoffReasons.length > 0 && (
        <div className="mt-[9px]">
          <div className="mb-[5px] text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            {t('mailVariantsPage.flowDropoffReasons')}
          </div>
          <ul className="flex flex-col gap-[3px]">
            {outcome.dropoffReasons.map((r, i) => (
              <li key={i} className="flex gap-[7px] text-[11.5px] leading-[1.5] text-muted">
                <span aria-hidden className="select-none text-faint">
                  ·
                </span>
                <span className="min-w-0 flex-1">{r.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
