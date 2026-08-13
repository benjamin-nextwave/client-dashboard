import type { TranslationKey } from '@/lib/i18n'

// Vertaalsleutels per onboardingstap. Bewust een eigen module zonder
// 'use client': zowel de servercomponent (page.tsx, voor het knoplabel van de
// actieve stap) als de clientcomponenten lezen hieruit. Stonden deze functies
// in een 'use client'-bestand, dan wordt elke export daaruit een
// client-referentie en levert aanroepen vanaf de server een renderfout op —
// precies wat er gebeurde zolang er nog een openstaande stap was.

/** Uitleg per stap. Vaste begeleidende tekst, geen data uit de database. */
const BODY_KEY: Record<string, TranslationKey> = {
  dashboard: 'onboardingPage.stepDashboardBody',
  form: 'onboardingPage.stepFormBody',
  drafts: 'onboardingPage.stepDraftsBody',
  variants: 'onboardingPage.stepVariantsBody',
  dnc: 'onboardingPage.stepDncBody',
}

/** Wat de knop op de actieve kaart zegt — hangt af van de stap, niet vast. */
const ACTION_KEY: Record<string, TranslationKey> = {
  form: 'onboardingPage.stepFormAction',
  variants: 'onboardingPage.stepVariantsAction',
  dnc: 'onboardingPage.stepDncAction',
}

export function stepBodyKey(id: string): TranslationKey | undefined {
  return BODY_KEY[id]
}

export function stepActionKey(id: string): TranslationKey | undefined {
  return ACTION_KEY[id]
}
