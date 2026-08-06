'use client'

import { useT } from '@/lib/i18n/client'

interface StatsCardsProps {
  emailsSent: number
  uniqueReplies: number
  bounced: number
  periodLabel: string
  /** Alleen voor de sparklines — dezelfde reeks die de grafiek eronder gebruikt. */
  dailyStats?: { date: string; emailsSent: number; replies: number }[]
}

/**
 * Sparkline-pad over een viewBox van 220×40. Geeft null terug bij te weinig
 * punten of een vlakke reeks, zodat er niets misleidends getekend wordt.
 */
function sparkline(values: number[]) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (max === min) return null

  const w = 220
  const h = 40
  const span = max - min
  const line = values
    .map((v, i) => {
      const x = (i * w) / (values.length - 1)
      const y = h - 4 - ((v - min) / span) * (h - 12)
      return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return { line, area: `${line} L${w},${h} L0,${h} Z` }
}

/**
 * `tone` bepaalt de kleur. Bij 'neg' — de bounced-kaart — tekenen we altijd
 * een lijn, ook als er geen reeks is: dan een vlakke lijn die letterlijk laat
 * zien dat er geen beweging is.
 */
function Sparkline({ values, tone = 'brand' }: { values: number[]; tone?: 'brand' | 'neg' }) {
  const path = sparkline(values)
  const isNeg = tone === 'neg'

  if (!path && !isNeg) return null

  const stroke = isNeg ? 'var(--c-neg)' : 'var(--color-brand)'
  const fill = isNeg ? 'color-mix(in oklab, var(--c-neg) 8%, transparent)' : 'var(--brand-10)'

  // Vlakke lijn op halve hoogte wanneer er niets te tekenen valt.
  const flat = { line: 'M0,20 L220,20', area: 'M0,20 L220,20 L220,40 L0,40 Z' }
  const d = path ?? flat

  return (
    <svg
      viewBox="0 0 220 40"
      preserveAspectRatio="none"
      className="-mx-[18px] mt-3.5 block h-10 w-[calc(100%+36px)]"
      aria-hidden
    >
      <path d={d.area} fill={fill} />
      <path
        d={d.line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function StatsCards({
  emailsSent,
  uniqueReplies,
  bounced,
  periodLabel,
  dailyStats = [],
}: StatsCardsProps) {
  const t = useT()

  // Alleen verzonden en reacties hebben een dagreeks. Bounced heeft die niet en
  // krijgt daarom een vlakke rode lijn: geen verzonnen verloop, wel zichtbaar
  // dat er geen beweging is.
  const cards = [
    {
      label: t('overview.statEmailsSent'),
      value: emailsSent.toLocaleString('nl-NL'),
      trend: dailyStats.map((d) => d.emailsSent),
      tone: 'brand' as const,
    },
    {
      label: t('overview.statUniqueReplies'),
      subtitle: t('overview.statUniqueRepliesSubtitle'),
      value: uniqueReplies.toLocaleString('nl-NL'),
      trend: dailyStats.map((d) => d.replies),
      tone: 'brand' as const,
    },
    {
      label: t('overview.statBounced'),
      value: bounced.toLocaleString('nl-NL'),
      trend: [] as number[],
      tone: 'neg' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col overflow-hidden rounded-panel border border-line bg-panel px-[18px] pb-4 pt-4 transition-colors hover:border-[var(--brand-32)]"
        >
          <div className="text-xs font-medium text-muted">{card.label}</div>
          <div className="mt-2.5 text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {card.value}
          </div>
          {'subtitle' in card && card.subtitle && (
            <p className="mt-1.5 text-[11px] leading-tight text-faint">{card.subtitle}</p>
          )}
          <div className="mt-auto">
            <Sparkline values={card.trend} tone={card.tone} />
          </div>
          <span className="sr-only">{periodLabel}</span>
        </div>
      ))}
    </div>
  )
}
