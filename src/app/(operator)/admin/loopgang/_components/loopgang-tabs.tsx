'use client'

import { useState } from 'react'
import type { LoopgangOverview } from '@/lib/data/loopgang-overview'
import { buildTasks } from '@/lib/loopgang/tasks'
import { AiAnalyse } from './ai-analyse'
import { CalendarView } from './calendar-view'
import { KixTasksView } from './kix-tasks-view'
import { TodoView } from './todo-view'

/**
 * Drie tabbladen op één pagina.
 *
 * De kalender is het beeld: wanneer valt wat. "Te doen" is de lijst: wat blijft
 * er liggen, op urgentie. "Kix taken" is het geheugen: wat is er verstuurd, hoe
 * vaak, en wat kwam eruit.
 *
 * De kalender blijft de standaard. De andere twee lezen dezelfde gegevens — er
 * wordt niets opnieuw opgehaald bij het wisselen.
 */

type Tab = 'kalender' | 'todo' | 'kix'

export function LoopgangTabs({ overview }: { overview: LoopgangOverview }) {
  const [tab, setTab] = useState<Tab>('kalender')

  // Alleen voor het getal op het tabblad: wat er nu of eerder had gemoeten.
  const openTaken = buildTasks(overview.clients, overview.today).length
  const openKix = overview.kixTasks.filter((t) => t.status === 'open').length

  const tabs: { key: Tab; label: string; badge: number | null }[] = [
    { key: 'kalender', label: 'Kalender', badge: null },
    { key: 'todo', label: 'Te doen', badge: openTaken },
    { key: 'kix', label: 'Kix taken', badge: openKix },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {t.label}
            {t.badge !== null && t.badge > 0 && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                  tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'kalender' && (
        <>
          <CalendarView overview={overview} />
          <AiAnalyse month={overview.month} />
        </>
      )}

      {tab === 'todo' && (
        <TodoView
          clients={overview.clients}
          kixTasks={overview.kixTasks}
          today={overview.today}
        />
      )}

      {tab === 'kix' && <KixTasksView tasks={overview.kixTasks} />}
    </div>
  )
}
