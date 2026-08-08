'use client'

import { useT } from '@/lib/i18n/client'
import type { OnboardingModel } from '../_lib/onboarding-model'

/** Voortgangskaart rechts in de kop: streepjes + wie er nog aan zet is. */
export function ProgressCard({ model }: { model: OnboardingModel }) {
  const t = useT()
  const mine = model.clientTodo.length
  const ours = model.nextwaveTodo.length

  return (
    <div className="w-full shrink-0 rounded-panel border border-line bg-panel px-[18px] py-4 sm:w-[270px]">
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="text-[11.5px] text-muted">{t('onboardingPage.progressTitle')}</span>
        <span className="text-[11.5px] font-semibold tabular-nums">
          {model.completedCount} / {model.totalCount}
        </span>
      </div>

      <div className="mt-[11px] flex gap-1">
        {model.pipStates.map((state, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-sm ${
              state === 'done' ? 'bg-pos opacity-55' : state === 'current' ? 'bg-brand' : 'bg-track'
            }`}
          />
        ))}
      </div>

      <div className="mt-3.5 flex gap-5 border-t border-line pt-[13px]">
        <div>
          <div className="text-[19px] font-semibold leading-none tracking-[-0.03em] tabular-nums text-brand">
            {mine}
          </div>
          <div className="mt-[5px] text-[11px] text-faint">
            {mine === 1 ? t('onboardingPage.stepsYoursSingular') : t('onboardingPage.stepsYours')}
          </div>
        </div>
        <div>
          <div className="text-[19px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
            {ours}
          </div>
          <div className="mt-[5px] text-[11px] text-faint">
            {ours === 1 ? t('onboardingPage.stepsOursSingular') : t('onboardingPage.stepsOurs')}
          </div>
        </div>
      </div>
    </div>
  )
}

export function DeadlineCard({ date, daysLeft }: { date: string; daysLeft: number }) {
  const t = useT()

  return (
    <div className="rounded-panel border border-[color-mix(in_oklab,var(--color-warn)_30%,var(--color-line))] bg-[color-mix(in_oklab,var(--color-warn)_6%,var(--color-panel))] px-4 py-[15px]">
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-warn)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0" aria-hidden>
          <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-warn">
          {t('onboardingPage.deadlineLabel')}
        </span>
      </div>
      <div className="mt-[9px] text-[19px] font-semibold tracking-[-0.03em]">{date}</div>
      <div className="mt-1 text-[11.5px] text-muted">
        {daysLeft === 1
          ? t('onboardingPage.daysLeftSingular')
          : t('onboardingPage.daysLeft', { count: daysLeft })}
      </div>
    </div>
  )
}

/** Wat er na de onboarding gebeurt. Statisch — dit is uitleg, geen data. */
export function WhatHappensNext() {
  const t = useT()

  const items = [
    { label: t('onboardingPage.next1'), meta: t('onboardingPage.next1Meta'), active: true },
    { label: t('onboardingPage.next2'), meta: t('onboardingPage.next2Meta'), active: false },
    { label: t('onboardingPage.next3'), meta: t('onboardingPage.next3Meta'), active: false },
    { label: t('onboardingPage.next4'), meta: t('onboardingPage.next4Meta'), active: false },
  ]

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-panel">
      <div className="border-b border-line px-4 py-[13px]">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
          {t('onboardingPage.nextTitle')}
        </h3>
      </div>
      <div className="px-4 pb-[15px] pt-3.5">
        {items.map((item, i) => (
          <div
            key={item.label}
            className={`flex items-start gap-[11px] ${i < items.length - 1 ? 'pb-3.5' : ''}`}
          >
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                item.active ? 'bg-brand shadow-[0_0_0_3px_var(--brand-15)]' : 'bg-line'
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-medium tracking-[-0.01em]">{item.label}</div>
              <div className="mt-[3px] text-[11px] text-faint">{item.meta}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Verwijst naar Hulp & uitleg. Het ontwerp had hier een kaart met een vaste
 * campagnemanager, maar er is nergens een manager per klant vastgelegd — dus
 * geen naam verzinnen.
 */
export function HelpCard() {
  const t = useT()

  return (
    <div className="rounded-panel border border-line bg-panel px-4 py-[15px]">
      <h3 className="text-[13px] font-semibold tracking-[-0.01em]">
        {t('onboardingPage.helpTitle')}
      </h3>
      <p className="mt-2 text-[11.5px] leading-[1.55] text-muted">
        {t('onboardingPage.helpBody')}
      </p>
      {/* Bewust een gewone link: de chatbot op Hulp & uitleg heeft een volledige
          paginalading nodig om ingebouwd te kunnen laden. */}
      <a
        href="/dashboard/hulp"
        className="mt-3 flex h-8 w-full items-center justify-center rounded-control border border-line bg-panel text-xs font-medium transition-colors hover:bg-[var(--brand-08)]"
      >
        {t('onboardingPage.helpButton')}
      </a>
    </div>
  )
}
