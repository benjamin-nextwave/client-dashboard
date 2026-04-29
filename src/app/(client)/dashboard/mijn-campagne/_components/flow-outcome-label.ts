import type { CampaignFlowOutcome, FlowOutcomeKind } from '@/lib/data/campaign-flow'
import type { TranslationKey, Translator } from '@/lib/i18n'

const NL_DEFAULT_LABEL_KEYS: Record<string, TranslationKey> = {
  'Lead is afgehaakt': 'flow.leadDroppedOff',
  'Lead reageerde positief': 'flow.positiveOutcome',
  'Geen reactie': 'flow.noResponse',
}

const FALLBACK_KEY_BY_KIND: Record<FlowOutcomeKind, TranslationKey> = {
  success: 'flow.positiveOutcome',
  dropoff: 'flow.leadDroppedOff',
  continue: 'flow.noResponse',
}

export function displayOutcomeLabel(outcome: CampaignFlowOutcome, t: Translator): string {
  const label = outcome.label?.trim()
  if (label && NL_DEFAULT_LABEL_KEYS[label]) {
    return t(NL_DEFAULT_LABEL_KEYS[label])
  }
  return label || t(FALLBACK_KEY_BY_KIND[outcome.kind])
}
