'use client'

import { useEffect, useRef } from 'react'

interface WheelEntry {
  id: string
  name: string
  color: string | null
  logo: string | null
}

interface Props {
  entries: WheelEntry[]
  rotation: number
  spinning: boolean
  onSpinComplete: () => void
}

const PALETTE = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
]

function polar(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg)
  const [x2, y2] = polar(cx, cy, r, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

function pickSliceColor(entry: WheelEntry, index: number, neighborColor: string | null): string {
  if (entry.color) return entry.color
  // Cycle palette but skip if matches neighbor
  let color = PALETTE[index % PALETTE.length]
  if (color === neighborColor) {
    color = PALETTE[(index + Math.floor(PALETTE.length / 2)) % PALETTE.length]
  }
  return color
}

function getReadableTextColor(bgHex: string): string {
  const m = bgHex.match(/^#?([\da-fA-F]{6})$/)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#1f2937' : '#ffffff'
}

export function Wheel({ entries, rotation, spinning, onSpinComplete }: Props) {
  const wheelRef = useRef<SVGGElement | null>(null)

  useEffect(() => {
    const el = wheelRef.current
    if (!el) return
    const handler = () => {
      if (spinning) onSpinComplete()
    }
    el.addEventListener('transitionend', handler)
    return () => el.removeEventListener('transitionend', handler)
  }, [spinning, onSpinComplete])

  const N = entries.length
  const cx = 250
  const cy = 250
  const r = 230
  const sliceDeg = N > 0 ? 360 / N : 0
  const lampCount = Math.max(24, Math.min(48, N * 2))
  const lampColors = ['#fef3c7', '#fed7aa', '#fecaca', '#e9d5ff', '#bae6fd']

  // Pre-compute slice colors avoiding neighbors
  const sliceColors: string[] = []
  for (let i = 0; i < N; i++) {
    const prev = sliceColors[i - 1] ?? null
    sliceColors.push(pickSliceColor(entries[i], i, prev))
  }
  if (N > 1 && sliceColors[0] === sliceColors[N - 1]) {
    sliceColors[N - 1] = PALETTE[(PALETTE.indexOf(sliceColors[N - 1]) + 3) % PALETTE.length]
  }

  return (
    <div
      className="relative aspect-square w-full max-w-[560px]"
      style={{ animation: 'wheel-glow 3.5s ease-in-out infinite' }}
    >
      {/* Outer lamp ring */}
      <svg viewBox="0 0 500 500" className="absolute inset-0 h-full w-full">
        {Array.from({ length: lampCount }).map((_, i) => {
          const angle = (i * 360) / lampCount
          const [lx, ly] = polar(250, 250, 248, angle)
          const color = lampColors[i % lampColors.length]
          return (
            <circle
              key={i}
              cx={lx}
              cy={ly}
              r={6}
              fill={color}
              style={{
                filter: `drop-shadow(0 0 6px ${color})`,
                animation: `lamp-around 0.7s ease-in-out ${(i % 2) * 0.35}s infinite`,
              }}
            />
          )
        })}
      </svg>

      {/* Wheel */}
      <svg viewBox="0 0 500 500" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="wheel-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="0" dy="3" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g
          ref={wheelRef}
          filter="url(#wheel-shadow)"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '250px 250px',
            transition: 'transform 5.5s cubic-bezier(0.17, 0.67, 0.16, 0.99)',
          }}
        >
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={r + 6} fill="#fff" />

          {N === 0 ? (
            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#6b7280" fontSize="22">
              Geen klanten
            </text>
          ) : (
            entries.map((entry, i) => {
              const start = i * sliceDeg
              const end = (i + 1) * sliceDeg
              const mid = start + sliceDeg / 2
              const fill = sliceColors[i]
              const textColor = getReadableTextColor(fill)
              // Plaats tekst op ~75% van de radius, en draai langs de straal naar buiten gericht.
              const labelRadius = r * 0.72
              const [tx, ty] = polar(cx, cy, labelRadius, mid)
              // Tekst-rotatie: laat tekst van binnen naar buiten lezen op de juiste hoek.
              const textRotation = mid > 180 ? mid - 270 : mid - 90
              const fontSize = N <= 8 ? 20 : N <= 14 ? 16 : N <= 20 ? 13 : 11
              // Trim lange namen voor wheel-rendering
              const displayName = entry.name.length > 22 ? entry.name.slice(0, 20) + '…' : entry.name
              return (
                <g key={entry.id}>
                  <path
                    d={arcPath(cx, cy, r, start, end)}
                    fill={fill}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={N <= 12 ? 1.5 : 0.75}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRotation}, ${tx}, ${ty})`}
                    fill={textColor}
                    fontSize={fontSize}
                    fontWeight={700}
                    style={{ pointerEvents: 'none' }}
                  >
                    {displayName}
                  </text>
                </g>
              )
            })
          )}

          {/* Center hub */}
          <circle cx={cx} cy={cy} r={32} fill="#fff" stroke="#1f2937" strokeWidth={3} />
          <circle cx={cx} cy={cy} r={20} fill="#1f2937" />
          <circle cx={cx} cy={cy} r={6} fill="#fef3c7" />
        </g>
      </svg>

      {/* Pointer (vast bovenop het rad) */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-10 -translate-x-1/2">
        <svg width="48" height="56" viewBox="0 0 48 56">
          <defs>
            <linearGradient id="pointer-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <path
            d="M24 52 L4 8 Q24 0 44 8 Z"
            fill="url(#pointer-gradient)"
            stroke="#7c2d12"
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <circle cx="24" cy="14" r="4" fill="#fef3c7" stroke="#7c2d12" strokeWidth={1.5} />
        </svg>
      </div>
    </div>
  )
}
