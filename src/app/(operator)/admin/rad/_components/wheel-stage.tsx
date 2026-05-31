'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { pickWheelClient, resetWheel } from '../actions'
import { Wheel } from './wheel'
import { Confetti } from './confetti'
import { HistorySidebar } from './history-sidebar'

interface ClientPick {
  id: string
  name: string
  color: string | null
  logo: string | null
}

interface HistoryItem extends ClientPick {
  pickedAt: string
}

interface Props {
  allCount: number
  remaining: ClientPick[]
  history: HistoryItem[]
}

type Phase = 'idle' | 'spinning' | 'celebrating' | 'confirming'

export function WheelStage({ allCount, remaining, history }: Props) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [pending, startTransition] = useTransition()
  const lastRandomSeed = useRef(0)

  const winner = winnerIndex !== null ? remaining[winnerIndex] ?? null : null
  const allDone = remaining.length === 0

  const handleSpin = () => {
    if (remaining.length === 0 || phase === 'spinning') return
    const target = Math.floor(Math.random() * remaining.length)
    setWinnerIndex(target)
    setPhase('spinning')
    // Volledige omwentelingen + landing op het midden van het gekozen segment.
    // De pointer staat aan de top (270° in CSS-rotatie-frame: -90° van het 0-uurpunt).
    // Het rad draait CW; we willen dat het segment-midden onder de pointer eindigt.
    const sliceDeg = 360 / remaining.length
    const landAt = 360 - (target * sliceDeg + sliceDeg / 2)
    const rotations = 6 + Math.floor(Math.random() * 3) // 6-8 omwentelingen
    const next = rotation + rotations * 360 + landAt - (rotation % 360)
    lastRandomSeed.current += 1
    setRotation(next)
  }

  const handleSpinComplete = () => {
    setPhase('celebrating')
  }

  const handleConfirm = () => {
    if (!winner) return
    setPhase('confirming')
    startTransition(async () => {
      await pickWheelClient(winner.id)
      setPhase('idle')
      setWinnerIndex(null)
      setRotation(0)
      router.refresh()
    })
  }

  const handleAgain = () => {
    setPhase('idle')
    setWinnerIndex(null)
  }

  const handleReset = () => {
    startTransition(async () => {
      await resetWheel()
      setPhase('idle')
      setWinnerIndex(null)
      setRotation(0)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <HistorySidebar history={history} totalCount={allCount} />

      <div className="relative flex min-h-[640px] flex-col items-center justify-center">
        {allDone ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="text-6xl">🎯</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Iedereen is geweest!</h2>
              <p className="mt-1 text-sm text-white/70">
                Alle {allCount} klanten zijn al een keer gekozen. Tijd om het rad te herstellen.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 px-7 py-3 text-base font-bold text-white shadow-2xl shadow-fuchsia-500/40 transition-all hover:-translate-y-0.5 hover:shadow-fuchsia-500/60 disabled:opacity-60"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              {pending ? 'Herstellen…' : 'Rad herstellen'}
            </button>
          </div>
        ) : (
          <>
            <Wheel
              entries={remaining}
              rotation={rotation}
              spinning={phase === 'spinning'}
              onSpinComplete={handleSpinComplete}
            />

            <button
              type="button"
              onClick={handleSpin}
              disabled={phase !== 'idle'}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 via-rose-500 to-fuchsia-600 px-9 py-3.5 text-base font-bold uppercase tracking-wider text-white shadow-2xl shadow-fuchsia-500/40 transition-all hover:-translate-y-0.5 hover:shadow-fuchsia-500/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
              {phase === 'spinning' ? 'Draaien…' : 'Draai het rad'}
            </button>

            <p className="mt-4 text-xs text-white/50">
              {remaining.length} {remaining.length === 1 ? 'klant' : 'klanten'} nog over op het rad
            </p>
          </>
        )}

        {/* Celebration overlay */}
        {phase === 'celebrating' && winner && (
          <div className="absolute inset-0 z-30 flex items-center justify-center">
            <Confetti />
            <div
              className="relative max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-white/95 via-white/90 to-white/95 p-8 text-center shadow-2xl backdrop-blur-xl"
              style={{
                animation: 'celebration-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              }}
            >
              <div className="text-5xl">🎉</div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-600">
                Het rad heeft gekozen
              </div>
              <h3 className="mt-2 text-3xl font-bold text-gray-900">{winner.name}</h3>
              <p className="mt-2 text-sm text-gray-600">
                Deze klant ga je vandaag mailen.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:shadow-emerald-500/50 disabled:opacity-60"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Ga ik mailen
                </button>
                <button
                  type="button"
                  onClick={handleAgain}
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md disabled:opacity-60"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  Nog eens draaien
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
