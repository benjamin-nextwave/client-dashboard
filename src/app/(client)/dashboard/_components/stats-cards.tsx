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

function Sparkline({ values }: { values: number[] }) {
  const path = sparkline(values)
  if (!path) return null

  return (
    <svg
      viewBox="0 0 220 40"
      preserveAspectRatio="none"
      className="-mx-[18px] mt-3.5 block h-10 w-[calc(100%+36px)]"
      aria-hidden
    >
      <path d={path.area} fill="var(--brand-10)" />
      <path
        d={path.line}
        fill="none"
        stroke="var(--color-brand)"
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

  // Alleen verzonden en reacties hebben een dagreeks. Voor bounced bestaat die
  // niet, dus die kaart krijgt bewust geen sparkline in plaats van een verzonnen
  // lijn.
  const cards = [
    {
      label: t('overview.statEmailsSent'),
      value: emailsSent.toLocaleString('nl-NL'),
      trend: dailyStats.map((d) => d.emailsSent),
    },
    {
      label: t('overview.statUniqueReplies'),
      subtitle: t('overview.statUniqueRepliesSubtitle'),
      value: uniqueReplies.toLocaleString('nl-NL'),
      trend: dailyStats.map((d) => d.replies),
    },
    {
      label: t('overview.statBounced'),
      value: bounced.toLocaleString('nl-NL'),
      trend: [] as number[],
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col overflow-hidden rounded-panel border border-line bg-panel px-[18px] pb-4 pt-4"
        >
          <div className="text-xs font-medium text-muted">{card.label}</div>
          <div className="mt-2.5 text-[30px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
            {card.value}
          </div>
          {'subtitle' in card && card.subtitle && (
            <p className="mt-1.5 text-[11px] leading-tight text-faint">{card.subtitle}</p>
          )}
          <div className="mt-auto">
            <Sparkline values={card.trend} />
          </div>
          <span className="sr-only">{periodLabel}</span>
        </div>
      ))}
    </div>
  )
}
