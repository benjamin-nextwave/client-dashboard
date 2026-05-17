'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  submitCheck,
  type CheckAnswersPayload,
  type CheckAnswerEntry,
  type CheckCampaignBlock,
  type SubmitCheckTask,
} from '../../../../actions'
import {
  liveQuestionsFor,
  onboardingQuestionsFor,
  SKIPPED_ANSWER,
  type CheckQuestion,
  type QuestionType,
  type QuestionThreshold,
  type Persona,
} from '../../../../_lib/questions'

interface SessionClient {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  isOnboarding: boolean
  /** Statisch maandcijfer 'contacten te benaderen', voor {{aantal}}-template. */
  monthlyContacts: number | null
}

interface CheckSessionProps {
  clients: SessionClient[]
  persona: Persona
}

interface TaskDraft {
  description: string
  campaignIndices: number[]
  assignee: Persona
  /** Niet-leeg betekent: deze taak is via een threshold-suggestie aangemaakt
   *  vanaf de vraag met deze key. Voorkomt dubbele toevoeging bij dezelfde vraag. */
  sourceKey: string | null
}

interface ClientFormState {
  checkType: 'onboarding' | 'live' | null
  numCampaigns: number | null
  campaignNames: string[]
  answers: Record<string, string>
  tasks: TaskDraft[]
  /** Set met `key`s die de operator al expliciet heeft afgewezen
   *  ("Niet nodig") — zodat de suggestie niet steeds terugkomt. */
  dismissedSuggestions: Set<string>
  submitted: boolean
}

function emptyTask(persona: Persona): TaskDraft {
  return { description: '', campaignIndices: [], assignee: persona, sourceKey: null }
}

function emptyState(persona: Persona): ClientFormState {
  return {
    checkType: null,
    numCampaigns: null,
    campaignNames: [],
    answers: {},
    tasks: [emptyTask(persona)],
    dismissedSuggestions: new Set(),
    submitted: false,
  }
}

function isAnswered(value: string | undefined): boolean {
  if (value === undefined) return false
  if (value === SKIPPED_ANSWER) return true
  return value.trim().length > 0
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined || value === SKIPPED_ANSWER) return null
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function compare(answer: number, op: QuestionThreshold['op'], target: number): boolean {
  switch (op) {
    case 'lt':
      return answer < target
    case 'lte':
      return answer <= target
    case 'gt':
      return answer > target
    case 'gte':
      return answer >= target
  }
}

function fillTemplate(label: string, monthlyContacts: number | null): string {
  if (!label.includes('{{aantal}}')) return label
  const replacement = monthlyContacts === null ? '…' : String(monthlyContacts)
  return label.replace(/\{\{aantal\}\}/g, replacement)
}

export function CheckSession({ clients, persona }: CheckSessionProps) {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [states, setStates] = useState<Record<string, ClientFormState>>(
    () => Object.fromEntries(clients.map((c) => [c.id, emptyState(persona)]))
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, startTransition] = useTransition()

  const current = clients[activeIndex]
  const state = states[current.id]

  const onboardingQuestions = useMemo(
    () => onboardingQuestionsFor(persona),
    [persona]
  )
  const liveQuestions = useMemo(() => liveQuestionsFor(persona), [persona])

  const updateState = (clientId: string, patch: Partial<ClientFormState>) => {
    setStates((prev) => ({ ...prev, [clientId]: { ...prev[clientId], ...patch } }))
  }

  const setAnswer = (key: string, value: string) => {
    setStates((prev) => ({
      ...prev,
      [current.id]: {
        ...prev[current.id],
        answers: { ...prev[current.id].answers, [key]: value },
      },
    }))
  }

  const setTaskDescription = (i: number, value: string) => {
    setStates((prev) => {
      const tasks = [...prev[current.id].tasks]
      tasks[i] = { ...tasks[i], description: value }
      return { ...prev, [current.id]: { ...prev[current.id], tasks } }
    })
  }

  const setTaskAssignee = (i: number, assignee: Persona) => {
    setStates((prev) => {
      const tasks = [...prev[current.id].tasks]
      tasks[i] = { ...tasks[i], assignee }
      return { ...prev, [current.id]: { ...prev[current.id], tasks } }
    })
  }

  const toggleTaskCampaign = (i: number, campaignIndex: number) => {
    setStates((prev) => {
      const tasks = [...prev[current.id].tasks]
      const has = tasks[i].campaignIndices.includes(campaignIndex)
      tasks[i] = {
        ...tasks[i],
        campaignIndices: has
          ? tasks[i].campaignIndices.filter((c) => c !== campaignIndex)
          : [...tasks[i].campaignIndices, campaignIndex].sort((a, b) => a - b),
      }
      return { ...prev, [current.id]: { ...prev[current.id], tasks } }
    })
  }

  const addTask = () => {
    setStates((prev) => ({
      ...prev,
      [current.id]: {
        ...prev[current.id],
        tasks: [...prev[current.id].tasks, emptyTask(persona)],
      },
    }))
  }

  const removeTask = (i: number) => {
    setStates((prev) => {
      const tasks = prev[current.id].tasks.filter((_, idx) => idx !== i)
      return {
        ...prev,
        [current.id]: {
          ...prev[current.id],
          tasks: tasks.length === 0 ? [emptyTask(persona)] : tasks,
        },
      }
    })
  }

  /**
   * Aangeroepen vanuit een suggestie-callout. Voegt een vooringevulde taak
   * onderaan toe (bij live checks gekoppeld aan de campagne waarop de
   * suggestie betrekking had).
   */
  const acceptSuggestion = (sourceKey: string, suggestion: string, assignTo: Persona, campaignIndex: number | null) => {
    setStates((prev) => {
      const s = prev[current.id]
      // Idempotent: als deze suggestie al een taak heeft opgeleverd, niet opnieuw.
      if (s.tasks.some((t) => t.sourceKey === sourceKey)) return prev

      const newTask: TaskDraft = {
        description: suggestion,
        campaignIndices: campaignIndex !== null ? [campaignIndex] : [],
        assignee: assignTo,
        sourceKey,
      }
      // Lege bouwsteen (als die nog standaard staat) hergebruiken;
      // anders gewoon achteraan plakken.
      const isEmptyTrailing =
        s.tasks.length > 0 &&
        s.tasks[s.tasks.length - 1].description.trim().length === 0 &&
        s.tasks[s.tasks.length - 1].sourceKey === null
      const nextTasks = isEmptyTrailing
        ? [...s.tasks.slice(0, -1), newTask, emptyTask(persona)]
        : [...s.tasks, newTask]
      return { ...prev, [current.id]: { ...s, tasks: nextTasks } }
    })
  }

  const dismissSuggestion = (sourceKey: string) => {
    setStates((prev) => {
      const s = prev[current.id]
      const next = new Set(s.dismissedSuggestions)
      next.add(sourceKey)
      return { ...prev, [current.id]: { ...s, dismissedSuggestions: next } }
    })
  }

  const setCampaignName = (i: number, value: string) => {
    setStates((prev) => {
      const names = [...prev[current.id].campaignNames]
      names[i] = value
      return { ...prev, [current.id]: { ...prev[current.id], campaignNames: names } }
    })
  }

  const setNumCampaigns = (n: number) => {
    setStates((prev) => {
      const s = prev[current.id]
      const names = Array.from({ length: n }, (_, i) => s.campaignNames[i] ?? '')
      const tasks = s.tasks.map((t) => ({
        ...t,
        campaignIndices: t.campaignIndices.filter((idx) => idx < n),
      }))
      return {
        ...prev,
        [current.id]: { ...s, numCampaigns: n, campaignNames: names, answers: {}, tasks },
      }
    })
  }

  const allAnswered = useMemo(() => {
    if (!state || state.checkType === null) return false
    if (state.checkType === 'onboarding') {
      return onboardingQuestions.every((q) => isAnswered(state.answers[q.id]))
    }
    if (state.numCampaigns === null || state.numCampaigns < 1) return false
    for (let i = 0; i < state.numCampaigns; i++) {
      if ((state.campaignNames[i] ?? '').trim().length === 0) return false
      for (const q of liveQuestions) {
        const key = `${i}_${q.id}`
        if (!isAnswered(state.answers[key])) return false
      }
    }
    return true
  }, [state, onboardingQuestions, liveQuestions])

  const handleNext = () => {
    if (!allAnswered || state.checkType === null) return
    setSubmitError(null)

    const questionList = state.checkType === 'onboarding' ? onboardingQuestions : liveQuestions

    const payload: CheckAnswersPayload = state.checkType === 'onboarding'
      ? {
          type: 'onboarding',
          questions: questionList.map<CheckAnswerEntry>((q) => ({
            id: q.id,
            label: q.label,
            answer: state.answers[q.id] ?? '',
          })),
        }
      : {
          type: 'live',
          numCampaigns: state.numCampaigns!,
          campaigns: Array.from({ length: state.numCampaigns! }, (_, i) => ({
            index: i,
            questions: questionList.map<CheckAnswerEntry>((q) => ({
              id: q.id,
              label: fillTemplate(q.label, current.monthlyContacts),
              answer: state.answers[`${i}_${q.id}`] ?? '',
            })),
          })) satisfies CheckCampaignBlock[],
        }

    const submitTasks: SubmitCheckTask[] = state.tasks.map((t) => ({
      description: t.description,
      campaignNames:
        state.checkType === 'live'
          ? t.campaignIndices
              .map((i) => (state.campaignNames[i] ?? '').trim())
              .filter((n) => n.length > 0)
          : [],
      assignee: t.assignee,
    }))

    startTransition(async () => {
      const result = await submitCheck({
        clientId: current.id,
        checkType: state.checkType!,
        numCampaigns: state.checkType === 'onboarding' ? null : state.numCampaigns,
        answers: payload,
        tasks: submitTasks,
        persona,
      })

      if (result.error) {
        setSubmitError(result.error)
        return
      }

      updateState(current.id, { submitted: true })

      if (activeIndex < clients.length - 1) {
        setActiveIndex(activeIndex + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        router.push('/admin/controle')
      }
    })
  }

  const accent = current.primaryColor ?? '#6366f1'

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href={`/admin/controle/ochtend/${persona}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Stoppen
          </Link>

          <div className="flex items-center gap-3">
            <PersonaBadge persona={persona} />
            <ProgressIndicator
              current={activeIndex + 1}
              total={clients.length}
              accent={accent}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <ClientHeader
          client={current}
          chosenType={state.checkType}
          onSwitchType={() => updateState(current.id, {
            checkType: null,
            numCampaigns: null,
            campaignNames: [],
            answers: {},
            tasks: [emptyTask(persona)],
            dismissedSuggestions: new Set(),
          })}
        />

        {state.checkType === null ? (
          <CheckTypePicker
            suggestedType={current.isOnboarding ? 'onboarding' : 'live'}
            onboardingCount={onboardingQuestions.length}
            liveCount={liveQuestions.length}
            onPick={(t) => updateState(current.id, { checkType: t })}
          />
        ) : (
          <>
            <div className="mt-8 space-y-6">
              {state.checkType === 'onboarding' ? (
                <OnboardingForm
                  questions={onboardingQuestions}
                  answers={state.answers}
                  tasks={state.tasks}
                  dismissed={state.dismissedSuggestions}
                  monthlyContacts={current.monthlyContacts}
                  onChange={setAnswer}
                  onAcceptSuggestion={acceptSuggestion}
                  onDismissSuggestion={dismissSuggestion}
                />
              ) : (
                <LiveForm
                  questions={liveQuestions}
                  numCampaigns={state.numCampaigns}
                  campaignNames={state.campaignNames}
                  answers={state.answers}
                  tasks={state.tasks}
                  dismissed={state.dismissedSuggestions}
                  monthlyContacts={current.monthlyContacts}
                  onSetNumCampaigns={setNumCampaigns}
                  onSetCampaignName={setCampaignName}
                  onChange={setAnswer}
                  onAcceptSuggestion={acceptSuggestion}
                  onDismissSuggestion={dismissSuggestion}
                />
              )}

              <TasksBlock
                tasks={state.tasks}
                campaignNames={state.checkType === 'live' ? state.campaignNames : []}
                onChangeDescription={setTaskDescription}
                onChangeAssignee={setTaskAssignee}
                onToggleCampaign={toggleTaskCampaign}
                onAdd={addTask}
                onRemove={removeTask}
              />
            </div>

            {submitError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-6">
              <div className="text-xs text-gray-500">
                {allAnswered ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Alle vragen zijn beantwoord
                  </span>
                ) : (
                  <span>Beantwoord alle vragen om door te gaan</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={!allAnswered || isSubmitting}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {isSubmitting
                  ? 'Bezig met opslaan...'
                  : activeIndex < clients.length - 1
                    ? 'Nieuwe klant'
                    : 'Controle afronden'}
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function PersonaBadge({ persona }: { persona: Persona }) {
  const isB = persona === 'benjamin'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
        isB
          ? 'bg-gradient-to-r from-indigo-100 to-violet-100 text-indigo-700 ring-1 ring-indigo-200'
          : 'bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 ring-1 ring-amber-200'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isB ? 'bg-indigo-500' : 'bg-amber-500'}`} />
      {isB ? 'Benjamin' : 'Merlijn'}
    </span>
  )
}

function ProgressIndicator({
  current,
  total,
  accent,
}: {
  current: number
  total: number
  accent: string
}) {
  const pct = (current / total) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Voortgang</div>
        <div className="text-sm font-semibold text-gray-900">{current} / {total}</div>
      </div>
      <div className="relative h-2 w-32 overflow-hidden rounded-full bg-gray-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}aa)` }}
        />
      </div>
    </div>
  )
}

function ClientHeader({
  client,
  chosenType,
  onSwitchType,
}: {
  client: SessionClient
  chosenType: 'onboarding' | 'live' | null
  onSwitchType: () => void
}) {
  const accent = client.primaryColor ?? '#6366f1'
  const initials = client.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div
        className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white text-lg font-bold text-white shadow-sm"
        style={client.logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
      >
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt={client.companyName} className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="drop-shadow">{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">
          {client.companyName}
        </h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
            <span className="text-gray-400">Status:</span>
            {client.isOnboarding ? 'Onboarding' : 'Live'}
          </span>
          {client.monthlyContacts !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
              Doel deze maand: {client.monthlyContacts} contacten
            </span>
          )}
          {chosenType !== null && (
            <>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                chosenType === 'onboarding'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                {chosenType === 'onboarding' ? 'Onboarding controle' : 'Live controle'}
              </span>
              <button
                type="button"
                onClick={onSwitchType}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 underline-offset-2 transition-colors hover:text-indigo-600 hover:underline"
              >
                Wisselen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckTypePicker({
  suggestedType,
  onboardingCount,
  liveCount,
  onPick,
}: {
  suggestedType: 'onboarding' | 'live'
  onboardingCount: number
  liveCount: number
  onPick: (t: 'onboarding' | 'live') => void
}) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Welke controle wil je doorlopen?
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        De suggestie is gebaseerd op de huidige status van de klant, maar je kunt zelf kiezen.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <PickerCard
          onClick={() => onPick('onboarding')}
          isSuggested={suggestedType === 'onboarding'}
          gradient="from-amber-500 to-orange-500"
          icon={
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          }
          title="Onboarding controle"
          description={`${onboardingCount} vragen over mailboxen, Instantly, n8n/Supabase, mailopzetjes en clay scenario.`}
        />
        <PickerCard
          onClick={() => onPick('live')}
          isSuggested={suggestedType === 'live'}
          gradient="from-indigo-600 to-violet-600"
          icon={
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
          title="Live controle"
          description={`${liveCount} vragen per campagne over volumes, reply rates, schema en variabelen.`}
        />
      </div>
    </div>
  )
}

function PickerCard({
  onClick,
  isSuggested,
  gradient,
  icon,
  title,
  description,
}: {
  onClick: () => void
  isSuggested: boolean
  gradient: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative isolate overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10"
    >
      <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-20`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        {isSuggested && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
            Aanbevolen
          </span>
        )}
      </div>

      <h3 className="relative mt-4 text-lg font-semibold tracking-tight text-gray-900">
        {title}
      </h3>
      <p className="relative mt-1.5 text-sm text-gray-600">{description}</p>

      <div className="relative mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-all group-hover:translate-x-0.5 group-hover:text-indigo-600">
        Kies deze controle
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Onboarding form
// ---------------------------------------------------------------------------

function OnboardingForm({
  questions,
  answers,
  tasks,
  dismissed,
  monthlyContacts,
  onChange,
  onAcceptSuggestion,
  onDismissSuggestion,
}: {
  questions: CheckQuestion[]
  answers: Record<string, string>
  tasks: TaskDraft[]
  dismissed: Set<string>
  monthlyContacts: number | null
  onChange: (key: string, value: string) => void
  onAcceptSuggestion: (sourceKey: string, suggestion: string, assignTo: Persona, campaignIndex: number | null) => void
  onDismissSuggestion: (sourceKey: string) => void
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Onboarding checklist" subtitle="Beantwoord elke vraag om door te kunnen." />
      <div className="space-y-3">
        {questions.map((q, idx) => {
          const value = answers[q.id] ?? ''
          const sourceKey = `onboarding_${q.id}`
          const alreadyTaskedFor = tasks.some((t) => t.sourceKey === sourceKey)
          const isDismissed = dismissed.has(sourceKey)
          const suggestion = computeSuggestionForOnboarding(q, value)
          return (
            <div key={q.id} className="space-y-2">
              <QuestionField
                number={idx + 1}
                question={q}
                value={value}
                monthlyContacts={monthlyContacts}
                onChange={(v) => onChange(q.id, v)}
              />
              {q.contextInfo && (
                <ContextInfoBox text={q.contextInfo} />
              )}
              {suggestion && !alreadyTaskedFor && !isDismissed && (
                <SuggestionCallout
                  suggestion={suggestion.text}
                  assignTo={suggestion.assignTo}
                  onAccept={() => onAcceptSuggestion(sourceKey, suggestion.text, suggestion.assignTo, null)}
                  onDismiss={() => onDismissSuggestion(sourceKey)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Live form
// ---------------------------------------------------------------------------

function LiveForm({
  questions,
  numCampaigns,
  campaignNames,
  answers,
  tasks,
  dismissed,
  monthlyContacts,
  onSetNumCampaigns,
  onSetCampaignName,
  onChange,
  onAcceptSuggestion,
  onDismissSuggestion,
}: {
  questions: CheckQuestion[]
  numCampaigns: number | null
  campaignNames: string[]
  answers: Record<string, string>
  tasks: TaskDraft[]
  dismissed: Set<string>
  monthlyContacts: number | null
  onSetNumCampaigns: (n: number) => void
  onSetCampaignName: (i: number, value: string) => void
  onChange: (key: string, value: string) => void
  onAcceptSuggestion: (sourceKey: string, suggestion: string, assignTo: Persona, campaignIndex: number | null) => void
  onDismissSuggestion: (sourceKey: string) => void
}) {
  return (
    <div className="space-y-4">
      <CampaignCountPicker value={numCampaigns} onChange={onSetNumCampaigns} />

      {numCampaigns !== null && numCampaigns > 0 && (
        <div className="space-y-6">
          {Array.from({ length: numCampaigns }, (_, i) => {
            const name = campaignNames[i] ?? ''
            const namedTitle = name.trim().length > 0 ? name : `Campagne ${i + 1}`
            return (
              <div key={i} className="space-y-3">
                <CampaignNameHeader
                  index={i}
                  value={name}
                  onChange={(v) => onSetCampaignName(i, v)}
                />
                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const key = `${i}_${q.id}`
                    const value = answers[key] ?? ''
                    const sourceKey = `live_${i}_${q.id}`
                    const alreadyTaskedFor = tasks.some((t) => t.sourceKey === sourceKey)
                    const isDismissed = dismissed.has(sourceKey)
                    const suggestion = computeSuggestionForLive(q, value, answers, i, monthlyContacts)
                    return (
                      <div key={key} className="space-y-2">
                        <QuestionField
                          number={idx + 1}
                          question={q}
                          value={value}
                          monthlyContacts={monthlyContacts}
                          onChange={(v) => onChange(key, v)}
                        />
                        {suggestion && !alreadyTaskedFor && !isDismissed && (
                          <SuggestionCallout
                            suggestion={suggestion.text}
                            assignTo={suggestion.assignTo}
                            onAccept={() => onAcceptSuggestion(sourceKey, suggestion.text, suggestion.assignTo, i)}
                            onDismiss={() => onDismissSuggestion(sourceKey)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="text-[11px] text-gray-400">
                  Bovenstaande antwoorden horen bij <span className="font-semibold text-gray-600">{namedTitle}</span>.
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Suggestion logic
// ---------------------------------------------------------------------------

function computeSuggestionForOnboarding(
  q: CheckQuestion,
  value: string
): { text: string; assignTo: Persona } | null {
  if (value === SKIPPED_ANSWER) return null
  const type: QuestionType = q.type ?? 'text'

  if (type === 'checkbox' && q.suggestOnUnchecked) {
    // Onbeantwoorde checkbox triggert pas een suggestie als de gebruiker
    // de vraag bewust niet aanvinkt (impliciet: laat hem open). Om niet
    // op te dringen tonen we de suggestie hier alleen als ALS er al andere
    // antwoorden zijn ingevuld én deze leeg blijft is dat lastig betrouwbaar
    // te detecteren — we tonen daarom de suggestie nooit voor lege check-
    // boxen, alleen voor expliciete 'Nee'-antwoorden. Toch laten we de
    // suggestOnUnchecked-hint in de UI verschijnen zodra deze vraag NIET
    // aangevinkt is én een ander antwoord op de pagina al ingevuld is —
    // maar dat is buiten scope; voor nu houden we het op niets.
    return null
  }

  if (type === 'checkbox_cross' && q.suggestOnNo && value === 'Nee') {
    return { text: q.suggestOnNo.suggestion, assignTo: q.suggestOnNo.assignTo }
  }

  return null
}

function computeSuggestionForLive(
  q: CheckQuestion,
  value: string,
  allAnswers: Record<string, string>,
  campaignIndex: number,
  monthlyContacts: number | null
): { text: string; assignTo: Persona } | null {
  if (value === SKIPPED_ANSWER) return null
  const type: QuestionType = q.type ?? 'text'

  if (type === 'checkbox_cross' && q.suggestOnNo && value === 'Nee') {
    return { text: q.suggestOnNo.suggestion, assignTo: q.suggestOnNo.assignTo }
  }

  if (type === 'number' && q.threshold) {
    const answer = parseNumber(value)
    if (answer === null) return null

    const target = q.threshold.compareTo === 'monthlyContacts'
      ? monthlyContacts
      : (q.threshold.value ?? null)
    if (target === null) return null

    // Optionele extra voorwaarde (bv. alleen suggestie als er al >= 500
    // contacten benaderd zijn).
    if (q.threshold.condition) {
      const condKey = `${campaignIndex}_${q.threshold.condition.questionId}`
      const condValue = parseNumber(allAnswers[condKey])
      if (condValue === null) return null
      if (!compare(condValue, q.threshold.condition.op, q.threshold.condition.value)) {
        return null
      }
    }

    if (!compare(answer, q.threshold.op, target)) return null
    return { text: q.threshold.suggestion, assignTo: q.threshold.assignTo }
  }

  return null
}

// ---------------------------------------------------------------------------
// UI atoms
// ---------------------------------------------------------------------------

function CampaignNameHeader({
  index,
  value,
  onChange,
}: {
  index: number
  value: string
  onChange: (v: string) => void
}) {
  const filled = value.trim().length > 0
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${filled ? 'border-indigo-200' : 'border-amber-200'}`}>
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
            filled ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white' : 'bg-amber-100 text-amber-700'
          }`}
        >
          #{index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Naam van campagne {index + 1}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Bijv. Recruiters Q2 of Eigenaren Logistiek"
            className="mt-1 w-full rounded-md border-0 bg-transparent px-0 py-1 text-sm font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:ring-0"
          />
        </div>
      </div>
    </div>
  )
}

function CampaignCountPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (n: number) => void
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">Hoeveel campagnes heeft deze klant?</div>
      <p className="mt-1 text-xs text-gray-500">
        Per campagne stel je dezelfde controlevragen.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition-all ${
              value === n
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {n}
          </button>
        ))}
        <input
          type="number"
          min={1}
          max={50}
          value={value && value > 6 ? value : ''}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!Number.isNaN(n) && n > 0 && n <= 50) onChange(n)
          }}
          placeholder="Meer"
          className="h-10 w-20 rounded-xl border border-gray-200 bg-white px-3 text-center text-sm font-semibold text-gray-700 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
      </div>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <span className="text-[11px] text-gray-400">{subtitle}</span>
    </div>
  )
}

function ContextInfoBox({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ml-10 rounded-lg border border-blue-100 bg-blue-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[11px] font-semibold text-blue-700 hover:bg-blue-100/40"
      >
        <span className="inline-flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          {open ? 'Verberg context' : 'Toon context bij deze vraag'}
        </span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-blue-100 px-3 py-2 text-[12px] leading-relaxed text-blue-900 whitespace-pre-line">
          {text}
        </div>
      )}
    </div>
  )
}

function SuggestionCallout({
  suggestion,
  assignTo,
  onAccept,
  onDismiss,
}: {
  suggestion: string
  assignTo: Persona
  onAccept: () => void
  onDismiss: () => void
}) {
  const isB = assignTo === 'benjamin'
  return (
    <div className="ml-10 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div className="min-w-0">
            <div className="text-[12px] font-semibold text-amber-900">
              Taak toevoegen voor {isB ? 'Benjamin' : 'Merlijn'}?
            </div>
            <div className="text-[12px] text-amber-800">{suggestion}</div>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
          >
            Niet nodig
          </button>
          <button
            type="button"
            onClick={onAccept}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm ${
              isB
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Taak aanmaken
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionField({
  number,
  question,
  value,
  monthlyContacts,
  onChange,
}: {
  number: number
  question: CheckQuestion
  value: string
  monthlyContacts: number | null
  onChange: (v: string) => void
}) {
  const type: QuestionType = question.type ?? 'text'
  const skipped = value === SKIPPED_ANSWER
  const filled = isAnswered(value)
  const label = fillTemplate(question.label, monthlyContacts)

  const borderClass = skipped
    ? 'border-gray-300 bg-gray-50/60'
    : filled
      ? 'border-emerald-200'
      : 'border-gray-200'

  const numberBadgeClass = skipped
    ? 'bg-gray-300 text-white'
    : filled
      ? 'bg-emerald-500 text-white'
      : 'bg-gray-100 text-gray-500'

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${borderClass}`}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${numberBadgeClass}`}
        >
          {skipped ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : filled ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            number
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <label className={`text-sm font-semibold ${skipped ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
              {label}
            </label>
            <button
              type="button"
              onClick={() => onChange(skipped ? '' : SKIPPED_ANSWER)}
              className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                skipped
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
              }`}
              title={skipped ? 'Skip ongedaan maken' : 'Sla deze vraag over'}
            >
              {skipped ? (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  Overgeslagen
                </>
              ) : (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h13.5m-7.5-7.5L16.5 12 9 19.5" />
                  </svg>
                  Sla vraag over
                </>
              )}
            </button>
          </div>

          {!skipped && (
            <div className="mt-2">
              {type === 'text' && (
                <textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Typ je antwoord..."
                />
              )}
              {type === 'number' && (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  inputMode="decimal"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  placeholder="Bijv. 250"
                />
              )}
              {type === 'date' && (
                <input
                  type="date"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                />
              )}
              {type === 'checkbox' && (
                <CheckboxOnlyInput value={value} onChange={onChange} />
              )}
              {type === 'checkbox_cross' && (
                <CheckboxCrossInput value={value} onChange={onChange} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckboxOnlyInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const checked = value === 'Ja'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(checked ? '' : 'Ja')}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
          checked
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
            : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
            checked ? 'border-white bg-white text-emerald-600' : 'border-gray-300 bg-white'
          }`}
        >
          {checked && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </span>
        {checked ? 'Ja, in orde' : 'Aanvinken als in orde'}
      </button>
    </div>
  )
}

function CheckboxCrossInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const isYes = value === 'Ja'
  const isNo = value === 'Nee'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(isYes ? '' : 'Ja')}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
          isYes
            ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
            : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
            isYes ? 'border-white bg-white text-emerald-600' : 'border-gray-300 bg-white'
          }`}
        >
          {isYes && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </span>
        Ja
      </button>
      <button
        type="button"
        onClick={() => onChange(isNo ? '' : 'Nee')}
        className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
          isNo
            ? 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/30'
            : 'border-gray-200 bg-white text-gray-700 hover:border-rose-300 hover:bg-rose-50'
        }`}
      >
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all ${
            isNo ? 'border-white bg-white text-rose-600' : 'border-gray-300 bg-white'
          }`}
        >
          {isNo && (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          )}
        </span>
        Nee
      </button>
    </div>
  )
}

function TasksBlock({
  tasks,
  campaignNames,
  onChangeDescription,
  onChangeAssignee,
  onToggleCampaign,
  onAdd,
  onRemove,
}: {
  tasks: TaskDraft[]
  campaignNames: string[]
  onChangeDescription: (i: number, v: string) => void
  onChangeAssignee: (i: number, assignee: Persona) => void
  onToggleCampaign: (i: number, campaignIndex: number) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
  const hasCampaigns = campaignNames.length > 0
  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Taken voor vanmiddag</h3>
          <p className="text-xs text-gray-600">
            Voeg taken toe en kies per taak voor wie hij is. Lege regels worden niet opgeslagen.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {tasks.map((task, i) => (
          <div key={i} className="rounded-xl border border-amber-200 bg-white/80 p-3 shadow-sm">
            <div className="flex items-start gap-2">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
                {i + 1}
              </div>
              <textarea
                value={task.description}
                onChange={(e) => onChangeDescription(i, e.target.value)}
                rows={1}
                className="flex-1 resize-y rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-orange-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100"
                placeholder="Beschrijf de taak..."
              />
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  aria-label="Taak verwijderen"
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
                  </svg>
                </button>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Voor:</span>
              <AssigneeToggle
                value={task.assignee}
                onChange={(p) => onChangeAssignee(i, p)}
              />
              {hasCampaigns && (
                <TaskCampaignSelector
                  campaignNames={campaignNames}
                  selectedIndices={task.campaignIndices}
                  onToggle={(idx) => onToggleCampaign(i, idx)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-white/60 px-3 py-2 text-xs font-semibold text-amber-700 transition-all hover:border-amber-400 hover:bg-white"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nog een taak
      </button>
    </div>
  )
}

function AssigneeToggle({
  value,
  onChange,
}: {
  value: Persona
  onChange: (p: Persona) => void
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-gray-200 bg-white text-[11px] font-semibold">
      <button
        type="button"
        onClick={() => onChange('benjamin')}
        className={`px-2.5 py-1 transition-colors ${
          value === 'benjamin'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-600 hover:bg-indigo-50'
        }`}
      >
        Benjamin
      </button>
      <button
        type="button"
        onClick={() => onChange('merlijn')}
        className={`px-2.5 py-1 transition-colors ${
          value === 'merlijn'
            ? 'bg-amber-600 text-white'
            : 'text-gray-600 hover:bg-amber-50'
        }`}
      >
        Merlijn
      </button>
    </div>
  )
}

function TaskCampaignSelector({
  campaignNames,
  selectedIndices,
  onToggle,
}: {
  campaignNames: string[]
  selectedIndices: number[]
  onToggle: (campaignIndex: number) => void
}) {
  return (
    <>
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Campagne:</span>
      {campaignNames.map((name, idx) => {
        const selected = selectedIndices.includes(idx)
        const display = name.trim().length > 0 ? name : `Campagne ${idx + 1}`
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onToggle(idx)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
              selected
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
            }`}
          >
            {selected && (
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
            {display}
          </button>
        )
      })}
      {selectedIndices.length === 0 && (
        <span className="text-[10px] italic text-gray-400">geen campagne gekoppeld</span>
      )}
    </>
  )
}
