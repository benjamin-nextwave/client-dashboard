'use client'

import { useState } from 'react'
import type { MailVariantFeedbackSubmission } from '@/lib/data/campaign'
import { useT } from '@/lib/i18n/client'
import { firstUnresolvedId, flattenGroups, type MailGroup } from '../_lib/variant-groups'
import { VariantRail } from './variant-rail'
import { VariantDetail } from './variant-detail'
import { VariantsPdfCard } from './variants-pdf-card'

interface Props {
  groups: MailGroup[]
  allFeedbackByVariant: Record<string, MailVariantFeedbackSubmission[]>
  newSince: string | null
  newCount: number
  pdfUrl: string | null
  pdfNeedsAcknowledge: boolean
}

/**
 * Houdt de selectie tussen lijst en detail vast. Bewust hier en niet in de URL:
 * de tabkeuze is deelbaar, een individuele variant hoeft dat niet te zijn.
 */
export function VariantsTab({
  groups,
  allFeedbackByVariant,
  newSince,
  newCount,
  pdfUrl,
  pdfNeedsAcknowledge,
}: Props) {
  const t = useT()
  const [selectedId, setSelectedId] = useState<string | null>(() => firstUnresolvedId(groups))

  const all = flattenGroups(groups)
  const selected = all.find((v) => v.variant.id === selectedId) ?? all[0] ?? null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto lg:w-[272px]">
        {pdfUrl && (
          <VariantsPdfCard pdfUrl={pdfUrl} needsAcknowledge={pdfNeedsAcknowledge} />
        )}
        <VariantRail
          groups={groups}
          selectedId={selected?.variant.id ?? null}
          onSelect={setSelectedId}
          newSince={newSince}
          newCount={newCount}
        />
      </div>

      {selected ? (
        <VariantDetail
          key={selected.variant.id}
          view={selected}
          submissions={allFeedbackByVariant[selected.variant.id] ?? []}
        />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-panel border border-line bg-panel px-6 text-center text-[12.5px] text-faint">
          {t('mailVariantsPage.selectVariant')}
        </div>
      )}
    </div>
  )
}
