'use client'

import { useMemo } from 'react'

const COLORS = [
  '#fcd34d', // amber-300
  '#f87171', // red-400
  '#fb923c', // orange-400
  '#a78bfa', // violet-400
  '#f472b6', // pink-400
  '#34d399', // emerald-400
  '#60a5fa', // blue-400
  '#fde047', // yellow-300
  '#c084fc', // purple-400
  '#22d3ee', // cyan-400
]

const SHAPES = ['square', 'circle', 'rect', 'tri'] as const

interface Piece {
  id: number
  left: number
  delay: number
  duration: number
  drift: number
  endRotate: number
  size: number
  color: string
  shape: (typeof SHAPES)[number]
}

function generatePieces(count: number): Piece[] {
  const pieces: Piece[] = []
  for (let i = 0; i < count; i++) {
    pieces.push({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      duration: 2.4 + Math.random() * 2.4,
      drift: (Math.random() - 0.5) * 320,
      endRotate: 360 + Math.random() * 1080 * (Math.random() < 0.5 ? -1 : 1),
      size: 6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    })
  }
  return pieces
}

export function Confetti() {
  const pieces = useMemo(() => generatePieces(120), [])

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {pieces.map((p) => {
        const baseStyle = {
          left: `${p.left}%`,
          width: `${p.size}px`,
          height: p.shape === 'rect' ? `${p.size * 0.4}px` : `${p.size}px`,
          backgroundColor: p.color,
          animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          ['--drift' as string]: `${p.drift}px`,
          ['--end-rotate' as string]: `${p.endRotate}deg`,
        } as React.CSSProperties

        if (p.shape === 'tri') {
          return (
            <div
              key={p.id}
              className="absolute top-0"
              style={{
                ...baseStyle,
                backgroundColor: 'transparent',
                borderStyle: 'solid',
                borderWidth: `0 ${p.size / 2}px ${p.size}px ${p.size / 2}px`,
                borderColor: `transparent transparent ${p.color} transparent`,
                width: 0,
                height: 0,
              }}
            />
          )
        }

        return (
          <div
            key={p.id}
            className={`absolute top-0 ${p.shape === 'circle' ? 'rounded-full' : 'rounded-sm'}`}
            style={baseStyle}
          />
        )
      })}
    </div>
  )
}
