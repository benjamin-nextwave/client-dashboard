'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatEuroCents, isWeekday } from '@/lib/commissions-shared'
import type { LoopgangOverview } from '@/lib/data/loopgang-overview'
import { addDays } from '@/lib/loopgang/cycle'
import { buildTasks } from '@/lib/loopgang/tasks'
import { ClientNote } from './client-note'
import { KixDialog } from './kix-dialog'
import { ClientStrip } from './client-strip'
import { DayPanel } from './day-panel'
import { TaskDialog } from './task-dialog'
import { MonthGrid, PAUSE_ORANGE_DAYS, type DayCell, type DayEntry, type DayTone } from './month-grid'
import { ClientListDialog, InvoiceDialog, LeadReportDialog } from './dialogs'

interface Props {
  overview: LoopgangOverview
}

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]
const WEEKDAY_NAMES = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

/**
 * Tot hoeveel gekozen klanten de dagvakjes gekleurd worden.
 *
 * De kleur is een uitspraak over één campagne: groen is verstuurd, rood is een
 * werkdag zonder volume. Bij twintig klanten tegelijk wint altijd het somberste
 * geval en staat vrijwel elke dag rood — dan zegt de kleur niets meer. Vanaf
 * vier klanten laten we de vakjes daarom wit.
 */
const MAX_CLIENTS_FOR_TONE = 3

/**
 * Hoeveel je in één keer ziet. Een week is de standaard: dat is het venster
 * waarin het werk van deze en de komende dagen past zonder dat je scrollt.
 * Drie maanden is om terug te kijken, een dag om je op één klant te richten.
 */
type View = 'period' | 'quarter' | 'month' | 'week' | 'day'

const VIEW_LABELS: Record<View, string> = {
  period: 'Sinds periodestart',
  quarter: '3 maanden',
  month: 'Maand',
  week: 'Week',
  day: 'Dag',
}

const VIEW_ORDER: View[] = ['period', 'quarter', 'month', 'week', 'day']

type Focus = 'all' | 'action' | 'invoice' | 'meeting' | 'stalled'

const FOCUS_LABELS: Record<Focus, string> = {
  all: 'Alles',
  action: 'Vraagt actie',
  invoice: 'Factuur open',
  meeting: 'Meeting regelen',
  stalled: 'Staat stil',
}

export function CalendarView({ overview }: Props) {
  const router = useRouter()
  // Leeg is de standaard en betekent iedereen: de kalender is eerst een
  // maandoverzicht van alles wat er speelt.
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [focus, setFocus] = useState<Focus>('all')
  const [view, setView] = useState<View>('week')

  /**
   * De weergave volgt wie je hebt aangeklikt. Eén klant: dan wil je zijn hele
   * lopende periode zien, vanaf de startdatum. Meerdere klanten: dan is een
   * periode niet te tekenen, want ze beginnen op verschillende dagen — dan is
   * de maand het gemeenschappelijke raster. Niemand gekozen: de week.
   *
   * Een handmatige keuze blijft staan tot je de selectie wijzigt.
   */
  useEffect(() => {
    setView(selectedClients.length === 1 ? 'period' : selectedClients.length > 1 ? 'month' : 'week')
  }, [selectedClients.length])
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    overview.today.slice(0, 7) === overview.month ? overview.today : overview.rangeStart
  )
  const [quick, setQuick] = useState<'invoice' | 'report' | null>(null)
  const [managingList, setManagingList] = useState(false)
  const [kixOpen, setKixOpen] = useState(false)
  const [showTasks, setShowTasks] = useState(false)

  // Uit alle zichtbare klanten, niet uit de gefilterde: "taken van vandaag" hoort
  // compleet te zijn, ook als het filter net op één klant staat.
  const tasks = useMemo(
    () => buildTasks(overview.clients, overview.today),
    [overview.clients, overview.today]
  )

  const clients = useMemo(() => {
    return overview.clients.filter((client) => {
      if (selectedClients.length > 0 && !selectedClients.includes(client.key)) return false

      switch (focus) {
        case 'action':
          return client.cycle.reminders.some((r) => r.severity !== 'info')
        case 'invoice':
          return client.cycle.reminders.some(
            (r) =>
              r.kind === 'invoice-due' ||
              r.kind === 'paused-uninvoiced' ||
              (r.kind === 'payment-overdue' && r.severity === 'urgent')
          )
        case 'meeting':
          return client.cycle.reminders.some((r) => r.kind === 'meeting-schedule')
        case 'stalled':
          return client.isStalled && !client.isPaused
        default:
          return true
      }
    })
  }, [overview.clients, selectedClients, focus])

  // Kleuren alleen bij een bewuste keuze van een paar klanten. "Iedereen" en
  // een brede selectie blijven wit.
  const kleurDagen =
    selectedClients.length >= 1 && selectedClients.length <= MAX_CLIENTS_FOR_TONE

  // De periodeweergave heeft precies één klant met een startpunt nodig; anders
  // valt hij terug op de maand.
  const periodClient =
    clients.length === 1 && clients[0].cycle.anchor ? clients[0] : null
  const effectiveView: View = view === 'period' && !periodClient ? 'month' : view

  const periods = useMemo(
    () =>
      buildPeriods(
        effectiveView,
        overview.month,
        selectedDate,
        overview.today,
        clients,
        kleurDagen,
        periodClient,
        overview.rangeStart
      ),
    [
      effectiveView,
      overview.month,
      selectedDate,
      overview.today,
      overview.rangeStart,
      clients,
      kleurDagen,
      periodClient,
    ]
  )

  const entriesForSelected = useMemo(() => {
    for (const period of periods) {
      const cell = period.cells.find((c) => c.date === selectedDate)
      if (cell) return cell.entries
    }
    return []
  }, [periods, selectedDate])

  /**
   * Vastleggen kan alleen bij precies één gekozen klant. Bij iedereen of bij een
   * handvol klanten is het overzicht een maandbeeld, en dan is er geen klant om
   * een factuur, rapportage of meeting aan te hangen — een verkeerde klant kiezen
   * zou hier stilletjes de hele cyclus verzetten.
   */
  const activeClientKey = selectedClients.length === 1 ? selectedClients[0] : null
  const activeClient = activeClientKey
    ? overview.clients.find((c) => c.key === activeClientKey)
    : undefined


  /**
   * Een week of dag verder of terug. Blijft de nieuwe dag binnen het opgehaalde
   * venster, dan hoeft er niets herladen te worden; stapt hij eruit, dan halen
   * we de maand op waar hij in valt.
   */
  function step(richting: 1 | -1) {
    const doel = addDays(selectedDate, richting * (view === 'week' ? 7 : 1))
    setSelectedDate(doel)
    if (doel < overview.rangeStart || doel > overview.rangeEnd) {
      router.push(`/admin/loopgang?maand=${doel.slice(0, 7)}`)
    }
  }

  function goToday() {
    setSelectedDate(overview.today)
    if (overview.today < overview.rangeStart || overview.today > overview.rangeEnd) {
      router.push(`/admin/loopgang?maand=${overview.today.slice(0, 7)}`)
    }
  }

  function toggleClient(key: string) {
    setSelectedClients((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    )
  }

  const prevMonth = shiftMonth(overview.month, -1)
  const nextMonth = shiftMonth(overview.month, 1)

  // De kop zegt wat je ziet, niet welke maand toevallig geladen is.
  const periodTitle =
    effectiveView === 'period' && periodClient
      ? `${periodClient.displayName} — sinds ${formatDayShort(periodClient.cycle.anchor as string)}`
      : effectiveView === 'day'
      ? formatDayLong(selectedDate)
      : effectiveView === 'week'
        ? `week van ${formatDayShort(startOfWeek(selectedDate))} t/m ${formatDayShort(
            addDays(startOfWeek(selectedDate), 6)
          )}`
        : effectiveView === 'quarter'
          ? `${monthTitle(prevMonth)} — ${monthTitle(nextMonth)}`
          : monthTitle(overview.month)

  return (
    <div className="space-y-5">
      {/* Vandaag + kerncijfers */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Vandaag
            </div>
            <div className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">
              {formatDayLong(overview.today)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {overview.todayIsWorkday
                ? 'Werkdag — verzendvolume telt vandaag mee.'
                : 'Geen werkdag — de volumecijfers slaan op de laatste werkdag.'}
            </div>
          </div>


          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Stat label="Draait" value={overview.totals.running} tone="ok" />
            <Stat label="Staat stil" value={overview.totals.stalled} tone="warn" />
            <Stat label="Factuur te laat" value={overview.totals.invoicesDue} tone="bad" />
            <Stat label="Meeting regelen" value={overview.totals.meetingsToPlan} tone="warn" />
          </div>
        </div>

        {/* Vastleggen kan altijd, zonder eerst een dag of klant te hoeven
            zoeken. De datum in de dialoog volgt de dag die in de kalender
            geselecteerd staat. */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={() => setShowTasks(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-colors ${
              tasks.length > 0
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            Taken van vandaag ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setKixOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
            </svg>
            Kix toevoegen
          </button>
          <button
            type="button"
            onClick={() => setQuick('invoice')}
            disabled={!activeClient}
            title={activeClient ? undefined : 'Kies eerst één klant'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11px] font-semibold transition-colors ${
              activeClient
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-300'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Factuur toevoegen
          </button>
          <button
            type="button"
            onClick={() => setQuick('report')}
            disabled={!activeClient}
            title={activeClient ? undefined : 'Kies eerst één klant'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[11px] font-semibold transition-colors ${
              activeClient
                ? 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Leadrapportage toevoegen
          </button>

          <span className="self-center text-[11px] text-gray-400">
            {activeClient
              ? `Bewerken voor ${activeClient.displayName}`
              : selectedClients.length > 1
                ? `${selectedClients.length} klanten geselecteerd — kies er één om iets vast te leggen`
                : 'Kies één klant om een factuur, rapportage of meeting vast te leggen'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-[11px]">
          <Pill
            tone={overview.totals.callsToday > 0 ? 'warn' : 'muted'}
            text={`${overview.totals.callsToday} klant(en) vandaag bellen voor een meeting`}
          />
          <Pill
            tone={overview.totals.paymentsOverdue > 0 ? 'bad' : 'muted'}
            text={`${overview.totals.paymentsOverdue} factuur/facturen over de betaaltermijn`}
          />
          <Pill
            tone="muted"
            text={`Openstaand: ${formatEuroCents(overview.totals.openInvoiceCents)}`}
          />
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FOCUS_LABELS) as Focus[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFocus(key)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                focus === key
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {FOCUS_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Klanten
          </span>

          {/* Geen selectie betekent iedereen; die knop maakt dat zichtbaar in
              plaats van dat je moet raden wat er gebeurt als je alles uitzet. */}
          <button
            type="button"
            onClick={() => setSelectedClients([])}
            aria-pressed={selectedClients.length === 0}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
              selectedClients.length === 0
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Iedereen
          </button>

          {overview.clients.map((client) => {
            const active = selectedClients.includes(client.id)
            return (
              <button
                key={client.key}
                type="button"
                onClick={() => toggleClient(client.key)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {client.displayName}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setManagingList(true)}
            className="ml-1 text-[11px] font-semibold text-gray-400 underline-offset-2 hover:text-gray-900 hover:underline"
          >
            lijst beheren ({overview.clients.length}/{overview.clientOptions.length})
          </button>
        </div>
      </section>

      {/* Maandnavigatie */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold text-gray-900">{periodTitle}</h2>

          {/* De kleuren gaan over één campagne. Staat er een handvol klanten in
              beeld, dan zegt de legenda wat je ziet; daarboven vertelt hij
              waarom de vakjes wit blijven. */}
          {kleurDagen ? (
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-gray-500">
              <Legend className="bg-emerald-100" label="verstuurd" />
              <Legend className="bg-amber-100" label={`pauze, dag 1-${PAUSE_ORANGE_DAYS}`} />
              <Legend className="bg-rose-100" label="stil of langer gepauzeerd" />
            </div>
          ) : (
            <span className="text-[10px] text-gray-400">
              Kies hooguit {MAX_CLIENTS_FOR_TONE} klanten om de dagen te kleuren.
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* De weergaveschakelaar staat naast de navigatie: eerst kiezen hoe
              groot je venster is, dan waar je heen springt. */}
          <div className="mr-1 inline-flex rounded-lg border border-gray-200 p-0.5">
            {VIEW_ORDER.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  view === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>

          {effectiveView === 'week' || effectiveView === 'day' ? (
            <>
              <StepButton label="← vorige" onClick={() => step(-1)} />
              <StepButton label="vandaag" onClick={() => goToday()} />
              <StepButton label="volgende →" onClick={() => step(1)} />
            </>
          ) : (
            <>
              <MonthLink month={prevMonth} label="← vorige" />
              <MonthLink month={overview.today.slice(0, 7)} label="vandaag" />
              <MonthLink month={nextMonth} label="volgende →" />
            </>
          )}
        </div>
      </div>

      {/* Kalender + wat er die dag speelt */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          {periods.map((period) => (
            <MonthGrid
              key={period.key}
              cells={period.cells}
              selected={selectedDate}
              onSelect={setSelectedDate}
              title={period.title}
              columns={effectiveView === 'day' ? 1 : 7}
              showWeekdays={effectiveView !== 'period'}
            />
          ))}
        </div>
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* De notitie hoort boven het dagpaneel: hij geldt altijd, niet
              alleen op de dag die je toevallig hebt aangeklikt. */}
          {activeClient && <ClientNote client={activeClient} />}

          <DayPanel
            date={selectedDate}
            today={overview.today}
            clients={clients}
            entries={entriesForSelected}
            activeClientKey={activeClientKey}
          />
        </div>
      </div>

      {/* De klanten liggen over de volle breedte onder de kalender: naast de
          kalender werd het een lange kolom die je moest scrollen. */}
      <ClientStrip
        date={selectedDate}
        today={overview.today}
        clients={clients}
        activeClientKey={activeClientKey}
        onSelectClient={(key) => setSelectedClients([key])}
      />

      {quick === 'invoice' && activeClient && (
        <InvoiceDialog client={activeClient} today={selectedDate} onClose={() => setQuick(null)} />
      )}
      {quick === 'report' && activeClient && (
        <LeadReportDialog
          client={activeClient}
          today={selectedDate}
          onClose={() => setQuick(null)}
        />
      )}

      {kixOpen && (
        <KixDialog
          clients={overview.clients}
          today={overview.today}
          preselected={activeClient?.id ?? null}
          onClose={() => setKixOpen(false)}
        />
      )}

      {managingList && (
        <ClientListDialog
          options={overview.clientOptions}
          onClose={() => setManagingList(false)}
        />
      )}

      {showTasks && (
        <TaskDialog tasks={tasks} today={overview.today} onClose={() => setShowTasks(false)} />
      )}
    </div>
  )
}

function MonthLink({ month, label }: { month: string; label: string }) {
  return (
    <Link
      href={`/admin/loopgang?maand=${month}`}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      {label}
    </Link>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ok' | 'warn' | 'bad'
}) {
  const color =
    tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-rose-600'
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${value === 0 ? 'text-gray-300' : color}`}>
        {value}
      </div>
    </div>
  )
}

function Pill({ text, tone }: { text: string; tone: 'muted' | 'warn' | 'bad' }) {
  const styles =
    tone === 'bad'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-gray-200 bg-gray-50 text-gray-600'
  return <span className={`rounded-full border px-3 py-1 font-medium ${styles}`}>{text}</span>
}

interface Period {
  key: string
  /** Kop boven het raster; alleen gevuld als er meer dan één raster staat. */
  title?: string
  cells: DayCell[]
}

/** De maandag van de week waar `date` in valt. */
function startOfWeek(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay()
  return addDays(date, -((day + 6) % 7))
}

/**
 * De rasters die bij de gekozen weergave horen. Drie maanden levert drie
 * rasters op, de rest één.
 */
function buildPeriods(
  view: View,
  month: string,
  selectedDate: string,
  today: string,
  clients: LoopgangOverview['clients'],
  kleuren: boolean,
  periodClient: LoopgangOverview['clients'][number] | null,
  rangeStart: string
): Period[] {
  // Één keer alle gebeurtenissen op datum zetten, zodat elk vakje alleen nog
  // hoeft op te zoeken. De klantvolgorde is de urgentievolgorde uit de
  // datalaag; die bepaalt ook welke blokjes als eerste in een vol vakje passen.
  const byDate = new Map<string, DayEntry[]>()
  for (const client of clients) {
    for (const event of client.events) {
      const list = byDate.get(event.date)
      if (list) list.push({ client, event })
      else byDate.set(event.date, [{ client, event }])
    }
  }

  const maak = (dates: string[], focusMonth: string | null) =>
    dates.map((date) => buildCell(date, focusMonth, today, clients, kleuren, byDate))

  if (view === 'period' && periodClient?.cycle.anchor) {
    // Het raster begint op de startdatum zelf, niet op de maandag ervoor: die
    // dag is het hele punt van deze weergave. Verder dan het opgehaalde bereik
    // kunnen we niet, anders staan er dagen zonder cijfers.
    const start =
      periodClient.cycle.anchor < rangeStart ? rangeStart : periodClient.cycle.anchor

    // Tot en met de einddag van de periode, of tot vandaag als die verder ligt —
    // een periode die over tijd is hoor je te zien lopen.
    const einde = periodClient.cycle.invoiceDueDate ?? today
    const laatste = einde > today ? einde : today

    const dates: string[] = []
    for (let d = start; d <= laatste && dates.length < 120; d = addDays(d, 1)) dates.push(d)

    return [{ key: `periode-${start}`, cells: maak(dates, null) }]
  }

  if (view === 'day') {
    return [{ key: selectedDate, cells: maak([selectedDate], null) }]
  }

  if (view === 'week') {
    const start = startOfWeek(selectedDate)
    const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i))
    return [{ key: start, cells: maak(dates, null) }]
  }

  const maanden =
    view === 'quarter' ? [shiftMonth(month, -1), month, shiftMonth(month, 1)] : [month]

  return maanden.map((m) => ({
    key: m,
    title: view === 'quarter' ? monthTitle(m) : undefined,
    cells: maak(monthDates(m), m),
  }))
}

/** Alle vakjes van een maandraster, inclusief de aanvullende rand­dagen. */
function monthDates(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  // getUTCDay: 0 = zondag. Wij beginnen op maandag, dus zondag schuift naar 6.
  const offset = (first.getUTCDay() + 6) % 7
  const gridStart = addDays(`${month}-01`, -offset)
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, i) => addDays(gridStart, i))
}

function monthTitle(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[(m ?? 1) - 1]} ${y}`
}

function buildCell(
  date: string,
  focusMonth: string | null,
  today: string,
  clients: LoopgangOverview['clients'],
  kleuren: boolean,
  byDate: Map<string, DayEntry[]>
): DayCell {
  // Bij een week- of dagweergave is er geen maand om buiten te vallen: alles
  // wat je ziet hoort erbij.
  const inMonth = focusMonth === null || date.slice(0, 7) === focusMonth
  const weekend = !isWeekday(date)

  // Alleen werkdagen tellen mee in "hoeveel klanten draaiden er": in het
  // weekend stuurt niemand, en dan zou elke zaterdag rood staan.
  const running = weekend ? 0 : clients.filter((c) => (c.sentByDate[date] ?? 0) > 0).length

  return {
    date,
    dayNumber: Number(date.slice(8, 10)),
    inMonth,
    isWeekend: weekend,
    isToday: date === today,
    isFuture: date > today,
    entries: byDate.get(date) ?? [],
    running,
    total: clients.length,
    tone: kleuren ? toneFor(date, today, weekend, inMonth, clients) : null,
    periodEnd: clients
      .filter((c) => c.cycle.invoiceDueDate === date)
      .map((c) => c.displayName),
  }
}

/**
 * De kleur van één dagvakje, over alle klanten die door het filter komen.
 *
 * Per klant is de dag groen als er is verstuurd, oranje als hij in de eerste
 * drie werkdagen van een pauze zit, en rood zodra die pauze langer duurt of er
 * op een werkdag niets is verstuurd terwijl de cyclus al liep. Dagen vóór het
 * startpunt van een klant tellen voor hem niet mee — daar viel nog niets te
 * verwachten.
 *
 * Het vakje krijgt het somberste geval: één rode klant maakt de dag rood. Zo
 * zie je bij het terugbladeren in één oogopslag waar het misging, ook als je
 * niet op één klant hebt gefilterd.
 */
function toneFor(
  date: string,
  today: string,
  weekend: boolean,
  inMonth: boolean,
  clients: LoopgangOverview['clients']
): DayTone {
  if (!inMonth || weekend || date > today) return null

  let beoordeeld = 0
  let groen = 0
  let rood = 0
  let oranje = 0

  for (const client of clients) {
    // Vóór het anker liep de cyclus nog niet; dan valt er niets te vinden van
    // een dag zonder verzending.
    if (!client.cycle.anchor || date < client.cycle.anchor) continue
    beoordeeld += 1

    if ((client.sentByDate[date] ?? 0) > 0) {
      groen += 1
      continue
    }

    const pauzedag = client.pauseDayByDate[date]
    if (pauzedag !== undefined) {
      if (pauzedag <= PAUSE_ORANGE_DAYS) oranje += 1
      else rood += 1
      continue
    }

    // Vandaag is nog niet afgelopen. Een campagne die vanochtend nog niet is
    // begonnen is niet stilgevallen, en 's nachts zou anders elke dag rood
    // beginnen. Groen kan hij wel worden zodra er iets is verstuurd.
    if (date === today) {
      beoordeeld -= 1
      continue
    }

    rood += 1
  }

  if (beoordeeld === 0) return null
  if (groen === beoordeeld) return 'green'
  if (rood > 0) return 'red'
  if (oranje > 0) return 'orange'
  return null
}

function formatDayShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTH_NAMES[(m ?? 1) - 1]}`
}

function StepButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      {label}
    </button>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-sm border border-black/5 ${className}`} />
      {label}
    </span>
  )
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`
}
