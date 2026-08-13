'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/client'
import type { OnboardingStep, StepOwner } from '../_lib/onboarding-model'
import { stepBodyKey } from '../_lib/step-keys'

function OwnerTag({ owner }: { owner: StepOwner }) {
  const t = useT()
  const isClient = owner === 'client'
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${
        isClient ? 'bg-[var(--brand-12)] text-brand-ink' : 'bg-track text-muted'
      }`}
    >
      {isClient ? t('onboardingPage.ownerClient') : t('onboardingPage.ownerNextwave')}
    </span>
  )
}

export function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-[11px]">
      <h2 className="text-[13px] font-semibold tracking-[-0.01em]">{title}</h2>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/**
 * De actieve stap: uitgeklapt, met de actieknop in een eigen voetbalk. De
 * knoppen komen van de aanroeper omdat ze per stap verschillen.
 */
export function ActiveStepCard({
  step,
  children,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  footerNote,
}: {
  step: OnboardingStep
  children?: React.ReactNode
  primaryLabel?: string
  primaryHref?: string
  secondaryLabel?: string
  secondaryHref?: string
  footerNote?: string
}) {
  const t = useT()
  const bodyKey = stepBodyKey(step.id)
  const hasFooter = Boolean(primaryLabel && primaryHref) || Boolean(footerNote)

  return (
    <div className="overflow-hidden rounded-[14px] border border-[color-mix(in_oklab,var(--color-brand)_32%,var(--color-line))] bg-panel">
      <div className="px-[22px] pb-[18px] pt-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold tabular-nums text-white shadow-[0_0_0_4px_var(--brand-15)]">
            {step.number}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-base font-semibold tracking-[-0.02em]">{step.label}</h3>
              <OwnerTag owner={step.owner} />
              {step.optional && (
                <span className="shrink-0 whitespace-nowrap rounded bg-track px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
                  {t('onboardingPage.optional')}
                </span>
              )}
            </div>
            {bodyKey && (
              <p className="mt-[9px] max-w-[600px] text-[13px] leading-[1.6] text-muted">
                {t(bodyKey)}
              </p>
            )}
          </div>
        </div>

        {children && <div className="mt-[18px]">{children}</div>}
      </div>

      {hasFooter && (
        <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-track px-[22px] py-3.5">
          {primaryLabel && primaryHref && (
            <Link
              href={primaryHref}
              className="flex h-9 items-center gap-2 whitespace-nowrap rounded-control bg-brand px-4 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {primaryLabel}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px]" aria-hidden>
                <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
          {secondaryLabel && secondaryHref && (
            <a
              href={secondaryHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 items-center whitespace-nowrap rounded-control border border-line bg-panel px-3.5 text-[12.5px] font-medium transition-colors hover:bg-[var(--brand-08)]"
            >
              {secondaryLabel}
            </a>
          )}
          <span className="flex-1" />
          {footerNote && <span className="text-[11.5px] text-muted">{footerNote}</span>}
        </div>
      )}
    </div>
  )
}

/** Een openstaande stap die niet de actieve is — compact, met of zonder knop. */
export function QuietStepCard({ step }: { step: OnboardingStep }) {
  const t = useT()
  const bodyKey = stepBodyKey(step.id)

  return (
    <div className="flex items-start gap-3.5 rounded-panel border border-line bg-panel px-[18px] py-[15px]">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-track text-xs font-bold tabular-nums text-faint">
        {step.number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">{step.label}</h3>
          <OwnerTag owner={step.owner} />
          {step.optional && (
            <span className="shrink-0 whitespace-nowrap rounded bg-track px-[7px] py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted">
              {t('onboardingPage.optional')}
            </span>
          )}
        </div>
        {bodyKey && (
          <p className="mt-[7px] max-w-[560px] text-[12.5px] leading-[1.55] text-muted">
            {t(bodyKey)}
          </p>
        )}
      </div>
      {step.href && step.owner === 'client' && (
        <Link
          href={step.href}
          className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-control border border-line bg-panel px-[13px] text-xs font-medium transition-colors hover:bg-[var(--brand-08)]"
        >
          {t('onboardingPage.open')}
        </Link>
      )}
    </div>
  )
}

/** Afgeronde stappen: één regel per stap, met datum en link terug. */
export function CompletedList({ steps }: { steps: OnboardingStep[] }) {
  const t = useT()

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-panel">
      {steps.map((step, i) => (
        <div
          key={step.id}
          className={`flex items-center gap-3 px-[18px] py-3 ${
            i < steps.length - 1 ? 'border-b border-line' : ''
          }`}
        >
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-pos)_13%,transparent)] text-pos">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" className="h-[11px] w-[11px]" aria-hidden>
              <path d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium tracking-[-0.01em]">
            {step.label}
          </span>
          <OwnerTag owner={step.owner} />
          {/* Stap 1 en 3 hebben geen tijdstempel; dan blijft deze kolom leeg. */}
          <span className="w-[52px] shrink-0 text-right text-[11.5px] tabular-nums text-faint">
            {step.completedAt
              ? new Date(step.completedAt).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                })
              : ''}
          </span>
          {step.href && (
            <Link
              href={step.href}
              className="shrink-0 whitespace-nowrap text-[11.5px] font-medium text-brand"
            >
              {t('onboardingPage.view')}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}
