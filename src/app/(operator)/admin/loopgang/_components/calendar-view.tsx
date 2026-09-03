'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatEuroCents, isWeekday } from '@/lib/commissions-shared'
import type { LoopgangOverview } from '@/lib/data/loopgang-overview'
import { addDays } from '@/lib/loopgang/cycle'
import { dayMarkFor } from '@/lib/loopgang/day-status'
import { buildTasks } from '@/lib/loopgang/tasks'
import { ClientNote } from './client-note'
import { KixDialog } from './kix-dialog'
import { DayPanel } from './day-panel'
import { KixHistory } from './kix-history'
import { StatBar } from './stat-bar'
import { TaskDialog } from './task-dialog'
import {
  MonthGrid,
  PAUSE_ORANGE_DAYS,
  type DayCell,
  type DayEntry,
  type DayTone,
  type KixMark,
} from './month-grid'
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
  const [showClients, setShowClients] = useState(false)
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
        overview.rangeStart,
        overview.kixTasks,
        clients.length === 1 ? clients[0] : null
      ),
    [
      effectiveView,
      overview.month,
      selectedDate,
      overview.today,
      overview.rangeStart,
      overview.kixTasks,
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
    <div className="space-y-6">
      {/* Kopbalk: wat is het vandaag, en wat kun je nu doen. Geen kader — dit
          is de titel van de pagina, geen blok tussen de blokken. */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Loopgang</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatDayLong(overview.today)} ·{' '}
            {overview.todayIsWorkday
              ? 'werkdag, het volume van vandaag telt mee'
              : 'geen werkdag, de cijfers slaan op de laatste werkdag'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTasks(true)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
              tasks.length > 0
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Taken van vandaag
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${
                tasks.length > 0 ? 'bg-white/20' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {tasks.length}
            </span>
          </button>

          <Link
            href="/admin/loopgang/rompslomp"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Facturen uit Rompslomp
          </Link>

          <button
            type="button"
            onClick={() => setKixOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
            </svg>
            Kix toevoegen
          </button>
        </div>
      </header>

      <StatBar
        clients={overview.clients}
        totals={overview.totals}
        today={overview.today}
        activeClientKey={activeClientKey}
        onSelectClient={(key) => {
          // Het filter mag de klant die je net aanklikt niet wegfilteren: de
          // lijst waar je hem uit koos telt over alle klanten, niet over de
          // gefilterde.
          setFocus('all')
          setSelectedClients([key])
        }}
      />

      {/* Filterbalk. De klantenlijst zit ingeklapt: twintig knoppen naast
          elkaar trekken meer aandacht dan de kalender eronder. */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
            {(Object.keys(FOCUS_LABELS) as Focus[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFocus(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  focus === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {FOCUS_LABELS[key]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowClients((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            {selectedClients.length === 0
              ? `Alle klanten (${overview.clients.length})`
              : `${selectedClients.length} gekozen`}
            <svg
              className={`h-3 w-3 transition-transform ${showClients ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {selectedClients.length > 0 && !showClients && (
            <div className="flex flex-wrap items-center gap-1.5">
              {overview.clients
                .filter((c) => selectedClients.includes(c.key))
                .map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleClient(c.key)}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                  >
                    {c.displayName}
                    <span aria-hidden className="text-indigo-400">
                      &times;
                    </span>
                  </button>
                ))}
              <button
                type="button"
                onClick={() => setSelectedClients([])}
                className="text-[11px] font-semibold text-gray-400 underline-offset-2 hover:text-gray-900 hover:underline"
              >
                wissen
              </button>
            </div>
          )}

          <span className="ml-auto text-[11px] text-gray-400">
            {activeClient
              ? `Vastleggen voor ${activeClient.displayName}`
              : 'Kies één klant om iets vast te leggen'}
          </span>
        </div>

        {showClients && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setSelectedClients([])}
              aria-pressed={selectedClients.length === 0}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                selectedClients.length === 0
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              Iedereen
            </button>

            {overview.clients.map((client) => {
              const active = selectedClients.includes(client.key)
              return (
                <button
                  key={client.key}
                  type="button"
                  onClick={() => toggleClient(client.key)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
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
        )}
      </section>

      {/* Kalender + wat er die dag speelt */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 className="text-sm font-semibold text-gray-900">{periodTitle}</h2>

          {/* De commissie over de lopende periode. Alleen hier: bij één klant
              die vanaf zijn startdatum in beeld staat is het een uitspraak over
              precies de periode die je ziet. Over een maandraster met twintig
              klanten zou hetzelfde getal nergens op slaan. */}
          {effectiveView === 'period' && periodClient && (
            <span className="text-[11px] text-gray-500">
              <span className="font-semibold tabular-nums text-gray-900">
                {formatEuroCents(periodClient.commissionCentsSinceAnchor)}
              </span>{' '}
              commissie ·{' '}
              <span className="tabular-nums">
                {periodClient.commissionLeadsSinceAnchor}
              </span>{' '}
              {periodClient.commissionLeadsSinceAnchor === 1 ? 'lead' : 'leads'}
            </span>
          )}

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

        <div className="divide-y divide-gray-100">
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
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* De notitie hoort boven het dagpaneel: hij geldt altijd, niet
              alleen op de dag die je toevallig hebt aangeklikt. */}
          {activeClient && <ClientNote client={activeClient} />}

          <KixHistory
            tasks={overview.kixTasks}
            clientId={activeClient?.id ?? null}
            clientName={activeClient?.displayName ?? null}
          />

          <DayPanel
            date={selectedDate}
            today={overview.today}
            clients={clients}
            entries={entriesForSelected}
            activeClientKey={activeClientKey}
          />
        </div>
      </div>

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

/**
 * De taaksoorten die over het regelen van de evaluatiemeeting gaan. Alleen die
 * kleuren een klokje groen: een factuurherinnering die naar Kix ging zegt niets
 * over of hij gebeld heeft.
 */
const MEETING_TASK_KINDS = new Set<string>(['meeting-call', 'meeting-mail', 'meeting-window'])

interface MarkContext {
  cycle: LoopgangOverview['clients'][number]['cycle']
  pausedDates: Set<string>
  kixSentDates: Set<string>
  meetingOutcome: 'planned' | 'stop' | 'continue' | null
  capStartedOn: string | null
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
  rangeStart: string,
  kixTasks: LoopgangOverview['kixTasks'],
  /** De enige gekozen klant; alleen dan hebben de dagtekens betekenis. */
  markClient: LoopgangOverview['clients'][number] | null
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

  // De dag waarop een taak voor het laatst naar Kix ging. Alleen de klanten die
  // door het filter komen: anders staat er een blokje bij een klant die je net
  // hebt weggefilterd.
  const zichtbaar = new Set(clients.map((c) => c.id))
  const kixByDate = new Map<string, KixMark[]>()
  for (const task of kixTasks) {
    if (!zichtbaar.has(task.clientId)) continue
    const dag = task.lastSentAt.slice(0, 10)
    const mark: KixMark = {
      client: task.clientName,
      label: task.label,
      count: task.reminderCount,
      done: task.status === 'done',
    }
    const list = kixByDate.get(dag)
    if (list) list.push(mark)
    else kixByDate.set(dag, [mark])
  }

  // De onderdelen die het dagteken bepalen: één keer klaarzetten in plaats van
  // per vakje opnieuw.
  const markContext = markClient
    ? {
        cycle: markClient.cycle,
        pausedDates: new Set(markClient.pausedDates),
        kixSentDates: new Set(
          kixTasks
            .filter((t) => t.clientId === markClient.id && MEETING_TASK_KINDS.has(t.kind))
            .flatMap((t) => t.sentDates)
        ),
        meetingOutcome: markClient.meeting?.outcome ?? null,
        capStartedOn: markClient.capStartedOn,
      }
    : null

  const maak = (dates: string[], focusMonth: string | null) =>
    dates.map((date) =>
      buildCell(date, focusMonth, today, clients, kleuren, byDate, kixByDate, markContext)
    )

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
  byDate: Map<string, DayEntry[]>,
  kixByDate: Map<string, KixMark[]>,
  markContext: MarkContext | null
): DayCell {
  // Bij een week- of dagweergave is er geen maand om buiten te vallen: alles
  // wat je ziet hoort erbij.
  const inMonth = focusMonth === null || date.slice(0, 7) === focusMonth
  const weekend = !isWeekday(date)

  // Alleen werkdagen tellen mee in "hoeveel klanten draaiden er": in het
  // weekend stuurt niemand, en dan zou elke zaterdag rood staan.
  const running = weekend ? 0 : clients.filter((c) => (c.sentByDate[date] ?? 0) > 0).length

  const periodStart = clients.filter((c) => c.cycle.anchor === date)

  // De balk zegt al dat de cyclus hier begint; het blokje 'start' ernaast is
  // dan dubbelop.
  const entries = (byDate.get(date) ?? []).filter(
    (e) => !(e.event.kind === 'cycle-start' && periodStart.some((c) => c.key === e.client.key))
  )

  return {
    date,
    dayNumber: Number(date.slice(8, 10)),
    inMonth,
    isWeekend: weekend,
    isToday: date === today,
    isFuture: date > today,
    entries,
    running,
    total: clients.length,
    tone: kleuren ? toneFor(date, today, weekend, inMonth, clients) : null,
    kixSent: kixByDate.get(date) ?? [],
    mark: markContext ? dayMarkFor({ date, today, ...markContext }) : null,
    periodStart: periodStart.map((c) => c.displayName),
    periodEnd: clients
      .filter((c) => c.cycle.invoiceDueDate === date)
      .map((c) => (c.cycle.endsOnCap ? `${c.displayName} (cap)` : c.displayName)),
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
