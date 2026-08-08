'use client'

import type { MailVariant } from '@/lib/data/campaign'
import { useT } from '@/lib/i18n/client'

/**
 * De varianten als kleine preview-kaartjes in de actieve stap. Geen echte
 * mailweergave — genoeg om te herkennen welke variant je nog moet beoordelen.
 * De volledige tekst staat op de pagina Mailvarianten.
 */
export function VariantPreviewGrid({ variants }: { variants: MailVariant[] }) {
  const t = useT()

  if (variants.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      {variants.slice(0, 4).map((variant) => {
        const approved = variant.clientApprovedAt !== null
        return (
          <div
            key={variant.id}
            className="min-w-0 rounded-[10px] border border-line bg-track px-[13px] py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
                {variant.variantLabel}
              </span>
              <span
                className={`h-[7px] w-[7px] shrink-0 rounded-full ${approved ? 'bg-pos' : 'bg-line'}`}
              />
            </div>

            <div className="mt-[9px] truncate text-xs font-semibold tracking-[-0.01em]">
              {variant.subject}
            </div>

            {/* Regels in plaats van de mailtekst — hier gaat het om herkenning. */}
            <div aria-hidden className="mt-2 flex flex-col gap-1">
              <span className="h-[3px] w-full rounded-sm bg-line" />
              <span className="h-[3px] w-[88%] rounded-sm bg-line" />
              <span className="h-[3px] w-[94%] rounded-sm bg-line" />
            </div>

            <div
              className={`mt-2.5 text-[10.5px] font-semibold ${approved ? 'text-pos' : 'text-muted'}`}
            >
              {approved ? t('onboardingPage.variantApproved') : t('onboardingPage.variantTodo')}
            </div>
          </div>
        )
      })}
    </div>
  )
}
