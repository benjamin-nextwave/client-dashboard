'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientListItem } from '@/lib/data/admin-stats'
import type { CalendarItem, CalendarLiveWindow } from '@/lib/data/controle-kalender'
import { ClientSidebar } from './client-sidebar'
import { MonthGrid } from './month-grid'
import { DayDetailModal } from './day-detail-modal'
import { PlanModal } from './plan-modal'

interface CalendarViewProps {
  clients: ClientListItem[]
  items: CalendarItem[]
  liveWindow: CalendarLiveWindow | null
  selectedClientId: string | null
  year: number
  month: number
}

const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export function CalendarView({
  clients,
  items,
  liveWindow,
  selectedClientId,
  year,
  month,
}: CalendarViewProps) {
  const router = useRouter()
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [planPrefillDate, setPlanPrefillDate] = useState<string | null>(null)

  const selectedClient = useMemo(
    () => (selectedClientId ? clients.find((c) => c.id === selectedClientId) ?? null : null),
    [clients, selectedClientId]
  )

  const itemsForOpenDate = useMemo(() => {
    if (!openDate) return []
    return items.filter((i) => i.date === openDate)
  }, [items, openDate])

  const goTo = (nextClient: string | null, nextYear: number, nextMonth: number) => {
    const params = new URLSearchParams()
    params.set('client', nextClient ?? 'all')
    params.set('year', String(nextYear))
    params.set('month', String(nextMonth))
    router.push(`/admin/controle/kalender?${params.toString()}`)
  }

  const goToMonth = (deltaMonths: number) => {
    let nm = month + deltaMonths
    let ny = year
    while (nm < 1) { nm += 12; ny -= 1 }
    while (nm > 12) { nm -= 12; ny += 1 }
    goTo(selectedClientId, ny, nm)
  }

  const onSelectClient = (clientId: string | null) => {
    goTo(clientId, year, month)
  }

  const openPlanForDate = (date: string | null) => {
    setPlanPrefillDate(date)
    setPlanOpen(true)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      <ClientSidebar
        clients={clients}
        selectedClientId={selectedClientId}
        onSelect={onSelectClient}
      />

      <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-1 shadow-sm ring-1 ring-blue-100">
        <div className="rounded-[1.4rem] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                aria-label="Vorige maand"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-all hover:bg-blue-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="text-lg font-bold capitalize tracking-tight text-gray-900">
                {MONTHS_NL[month - 1]}{' '}
                <span className="text-blue-600">{year}</span>
              </div>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                aria-label="Volgende maand"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-all hover:bg-blue-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedClient ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-700">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: selectedClient.primaryColor ?? '#3b82f6' }}
                  />
                  {selectedClient.companyName}
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-100 to-indigo-100 px-3 py-1.5 text-sm font-semibold text-blue-800">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                  </svg>
                  Alle bedrijven
                </div>
              )}
              <button
                type="button"
                onClick={() => openPlanForDate(null)}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Plannen
              </button>
            </div>
          </div>

          <Legend />

          <MonthGrid
            year={year}
            month={month}
            items={items}
            liveWindow={liveWindow}
            onClickDay={(date) => setOpenDate(date)}
          />
        </div>
      </div>

      <DayDetailModal
        open={openDate !== null}
        date={openDate}
        items={itemsForOpenDate}
        showClient={selectedClient === null}
        onClose={() => setOpenDate(null)}
        onPlan={(date) => {
          setOpenDate(null)
          openPlanForDate(date)
        }}
      />

      <PlanModal
        open={planOpen}
        clients={clients}
        defaultClientId={selectedClientId}
        defaultDate={planPrefillDate ?? todayIso()}
        onClose={() => setPlanOpen(false)}
      />
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium text-gray-500">
      <LegendDot color="bg-rose-500" label="Open taak" />
      <LegendDot color="bg-emerald-500" label="Afgerond" />
      <LegendDot color="bg-sky-500" label="Overzicht-event" />
      <LegendDot color="bg-amber-500" label="Notitie" />
      <div className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-md bg-gray-100 ring-1 ring-gray-200" />
        <span>Niet in livegang</span>
      </div>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  )
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
