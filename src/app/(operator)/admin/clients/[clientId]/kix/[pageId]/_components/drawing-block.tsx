'use client'

import { useRef, useState } from 'react'
import { kixId, type KixStroke } from '@/lib/kix/types'

// Het tekenvlak werkt in een vast coördinatenstelsel van 1000 breed bij
// `height` hoog. De SVG schaalt daarna mee met de kolombreedte, zodat een
// tekening op elk scherm dezelfde verhoudingen houdt en opgeslagen punten
// geldig blijven als het venster verandert.
const CANVAS_WIDTH = 1000

type Tool = KixStroke['tool'] | 'eraser'

const TOOLS: Array<{ id: Tool; label: string; icon: React.ReactNode }> = [
  {
    id: 'pen',
    label: 'Pen',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
    ),
  },
  {
    id: 'line',
    label: 'Lijn',
    icon: <path strokeLinecap="round" d="M4 20 20 4" />,
  },
  {
    id: 'arrow',
    label: 'Pijl',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 20 20 4m0 0h-7m7 0v7" />,
  },
  {
    id: 'rect',
    label: 'Rechthoek',
    icon: <rect x="4" y="6" width="16" height="12" rx="1.5" />,
  },
  {
    id: 'ellipse',
    label: 'Ovaal',
    icon: <ellipse cx="12" cy="12" rx="8" ry="6" />,
  },
  {
    id: 'eraser',
    label: 'Gum — klik op een vorm',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h8M4.5 15.5l4 4m-4-4 8.5-8.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L11 19H7l-2.5-3.5Z" />
    ),
  },
]

const COLORS = ['#1f2937', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#9333ea']
const WIDTHS = [2, 4, 8]

interface Props {
  strokes: KixStroke[]
  height: number
  onChange: (patch: { strokes?: KixStroke[]; height?: number }) => void
}

export function DrawingBlock({ strokes, height, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [width, setWidth] = useState(WIDTHS[1])
  const [draft, setDraft] = useState<KixStroke | null>(null)

  const pointFrom = (e: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    return {
      x: ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * height,
    }
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (tool === 'eraser') return
    const point = pointFrom(e)
    if (!point) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setDraft({ id: kixId(), tool, color, width, points: [point, point] })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draft) return
    const point = pointFrom(e)
    if (!point) return
    setDraft((current) => {
      if (!current) return current
      // De pen bewaart het hele spoor; de vormen hebben genoeg aan begin en eind.
      const points = current.tool === 'pen' ? [...current.points, point] : [current.points[0], point]
      return { ...current, points }
    })
  }

  const handlePointerUp = () => {
    if (!draft) return
    const isDot =
      draft.points.length === 2 &&
      Math.abs(draft.points[0].x - draft.points[1].x) < 2 &&
      Math.abs(draft.points[0].y - draft.points[1].y) < 2
    // Een enkele klik zonder sleep levert geen zichtbare vorm op; niet opslaan.
    if (!isDot) onChange({ strokes: [...strokes, draft] })
    setDraft(null)
  }

  const eraseStroke = (strokeId: string) => {
    if (tool !== 'eraser') return
    onChange({ strokes: strokes.filter((s) => s.id !== strokeId) })
  }

  const undo = () => onChange({ strokes: strokes.slice(0, -1) })
  const clear = () => onChange({ strokes: [] })
  const resize = (delta: number) =>
    onChange({ height: Math.min(900, Math.max(160, height + delta)) })

  const visible = draft ? [...strokes, draft] : strokes

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Gereedschap */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-2.5 py-2">
        <div className="flex items-center gap-0.5">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => setTool(t.id)}
              className={`rounded-lg p-1.5 transition-colors ${
                tool === t.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-white hover:text-gray-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                {t.icon}
              </svg>
            </button>
          ))}
        </div>

        <span className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={`Kleur ${c}`}
              onClick={() => setColor(c)}
              style={{ backgroundColor: c }}
              className={`h-5 w-5 rounded-full transition-transform ${
                color === c ? 'scale-110 ring-2 ring-gray-900 ring-offset-1' : 'hover:scale-110'
              }`}
            />
          ))}
        </div>

        <span className="h-5 w-px bg-gray-200" />

        <div className="flex items-center gap-1">
          {WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              title={`Dikte ${w}`}
              onClick={() => setWidth(w)}
              className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                width === w ? 'bg-gray-900' : 'hover:bg-white'
              }`}
            >
              <span
                className={`block rounded-full ${width === w ? 'bg-white' : 'bg-gray-500'}`}
                style={{ height: w, width: w }}
              />
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => resize(-80)}
            title="Lager"
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-white hover:text-gray-900"
          >
            −
          </button>
          <span className="text-[11px] tabular-nums text-gray-400">{height}</span>
          <button
            type="button"
            onClick={() => resize(80)}
            title="Hoger"
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-white hover:text-gray-900"
          >
            +
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={strokes.length === 0}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-white disabled:opacity-30"
          >
            Ongedaan
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={strokes.length === 0}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-white disabled:opacity-30"
          >
            Wissen
          </button>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_WIDTH} ${height}`}
        className={`block w-full touch-none bg-white ${tool === 'eraser' ? 'cursor-pointer' : 'cursor-crosshair'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <pattern id="kix-grid" width="25" height="25" patternUnits="userSpaceOnUse">
            <path d="M25 0H0v25" fill="none" stroke="#f1f5f9" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={CANVAS_WIDTH} height={height} fill="url(#kix-grid)" />
        {visible.map((stroke) => (
          <StrokeShape
            key={stroke.id}
            stroke={stroke}
            erasable={tool === 'eraser'}
            onErase={() => eraseStroke(stroke.id)}
          />
        ))}
      </svg>
    </div>
  )
}

function StrokeShape({
  stroke,
  erasable,
  onErase,
}: {
  stroke: KixStroke
  erasable: boolean
  onErase: () => void
}) {
  const common = {
    stroke: stroke.color,
    strokeWidth: stroke.width,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
    // In gum-modus vangt de vorm zelf de klik op; anders mag hij nooit in de
    // weg zitten van het tekenen eroverheen.
    pointerEvents: (erasable ? 'stroke' : 'none') as 'stroke' | 'none',
    onPointerDown: erasable
      ? (e: React.PointerEvent) => {
          e.stopPropagation()
          onErase()
        }
      : undefined,
    className: erasable ? 'cursor-pointer hover:opacity-40' : undefined,
  }

  const [a, b] = [stroke.points[0], stroke.points[stroke.points.length - 1]]

  switch (stroke.tool) {
    case 'pen':
      return <polyline {...common} points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')} />
    case 'line':
      return <line {...common} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
    case 'arrow': {
      const angle = Math.atan2(b.y - a.y, b.x - a.x)
      const head = Math.max(10, stroke.width * 4)
      const p1 = { x: b.x - head * Math.cos(angle - Math.PI / 6), y: b.y - head * Math.sin(angle - Math.PI / 6) }
      const p2 = { x: b.x - head * Math.cos(angle + Math.PI / 6), y: b.y - head * Math.sin(angle + Math.PI / 6) }
      return (
        <g {...common}>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" />
          <polyline
            points={`${p1.x},${p1.y} ${b.x},${b.y} ${p2.x},${p2.y}`}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )
    }
    case 'rect':
      return (
        <rect
          {...common}
          x={Math.min(a.x, b.x)}
          y={Math.min(a.y, b.y)}
          width={Math.abs(b.x - a.x)}
          height={Math.abs(b.y - a.y)}
          rx={4}
        />
      )
    case 'ellipse':
      return (
        <ellipse
          {...common}
          cx={(a.x + b.x) / 2}
          cy={(a.y + b.y) / 2}
          rx={Math.abs(b.x - a.x) / 2}
          ry={Math.abs(b.y - a.y) / 2}
        />
      )
  }
}
