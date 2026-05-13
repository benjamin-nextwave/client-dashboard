'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  submitCheck,
  type CheckAnswersPayload,
  type CheckAnswerEntry,
  type CheckCampaignBlock,
} from '../../../actions'
import { ONBOARDING_QUESTIONS, LIVE_QUESTIONS } from '../../../_lib/questions'

interface SessionClient {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  isOnboarding: boolean
}

interface CheckSessionProps {
  clients: SessionClient[]
}

// Per-client local form state. For onboarding, `answers` is keyed by question id.
// For live clients we hold a map per campaign index ("0", "1", ...).
interface ClientFormState {
  // null until the operator picks which checklist to run.
  checkType: 'onboarding' | 'live' | null
  // null until the live operator picks the number of campaigns.
  numCampaigns: number | null
  // For onboarding: { [questionId]: string }
  // For live: { [campaignIndex_questionId]: string } — flat for simpler updates.
  answers: Record<string, string>
  tasks: string[]
  submitted: boolean
}

function emptyState(): ClientFormState {
  return { checkType: null, numCampaigns: null, answers: {}, tasks: [''], submitted: false }
}

export function CheckSession({ clients }: CheckSessionProps) {
  const router = useRouter()
  const [activeIndex, setActiveIndex] = useState(0)
  const [states, setStates] = useState<Record<string, ClientFormState>>(
    () => Object.fromEntries(clients.map((c) => [c.id, emptyState()]))
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, startTransition] = useTransition()

  const current = clients[activeIndex]
  const state = states[current.id]

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

  const setTask = (i: number, value: string) => {
    setStates((prev) => {
      const tasks = [...prev[current.id].tasks]
      tasks[i] = value
      return { ...prev, [current.id]: { ...prev[current.id], tasks } }
    })
  }

  const addTask = () => {
    setStates((prev) => ({
      ...prev,
      [current.id]: { ...prev[current.id], tasks: [...prev[current.id].tasks, ''] },
    }))
  }

  const removeTask = (i: number) => {
    setStates((prev) => {
      const tasks = prev[current.id].tasks.filter((_, idx) => idx !== i)
      return {
        ...prev,
        [current.id]: { ...prev[current.id], tasks: tasks.length === 0 ? [''] : tasks },
      }
    })
  }

  const allAnswered = useMemo(() => {
    if (!state || state.checkType === null) return false
    if (state.checkType === 'onboarding') {
      return ONBOARDING_QUESTIONS.every((q) => (state.answers[q.id] ?? '').trim().length > 0)
    }
    if (state.numCampaigns === null || state.numCampaigns < 1) return false
    for (let i = 0; i < state.numCampaigns; i++) {
      for (const q of LIVE_QUESTIONS) {
        const key = `${i}_${q.id}`
        if ((state.answers[key] ?? '').trim().length === 0) return false
      }
    }
    return true
  }, [state])

  const handleNext = () => {
    if (!allAnswered || state.checkType === null) return
    setSubmitError(null)

    const payload: CheckAnswersPayload = state.checkType === 'onboarding'
      ? {
          type: 'onboarding',
          questions: ONBOARDING_QUESTIONS.map<CheckAnswerEntry>((q) => ({
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
            questions: LIVE_QUESTIONS.map<CheckAnswerEntry>((q) => ({
              id: q.id,
              label: q.label,
              answer: state.answers[`${i}_${q.id}`] ?? '',
            })),
          })) satisfies CheckCampaignBlock[],
        }

    startTransition(async () => {
      const result = await submitCheck({
        clientId: current.id,
        checkType: state.checkType!,
        numCampaigns: state.checkType === 'onboarding' ? null : state.numCampaigns,
        answers: payload,
        tasks: state.tasks,
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
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/admin/controle/ochtend"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Stoppen
          </Link>

          <ProgressIndicator
            current={activeIndex + 1}
            total={clients.length}
            accent={accent}
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Client header */}
        <ClientHeader
          client={current}
          chosenType={state.checkType}
          onSwitchType={() => updateState(current.id, {
            checkType: null,
            numCampaigns: null,
            answers: {},
          })}
        />

        {state.checkType === null ? (
          /* Type picker — shown before the questionnaire starts. */
          <CheckTypePicker
            suggestedType={current.isOnboarding ? 'onboarding' : 'live'}
            onPick={(t) => updateState(current.id, { checkType: t })}
          />
        ) : (
          <>
            {/* Form body */}
            <div className="mt-8 space-y-6">
              {state.checkType === 'onboarding' ? (
                <OnboardingForm
                  answers={state.answers}
                  onChange={setAnswer}
                />
              ) : (
                <LiveForm
                  numCampaigns={state.numCampaigns}
                  answers={state.answers}
                  onSetNumCampaigns={(n) => updateState(current.id, { numCampaigns: n, answers: {} })}
                  onChange={setAnswer}
                />
              )}

              <TasksBlock
                tasks={state.tasks}
                onChange={setTask}
                onAdd={addTask}
                onRemove={removeTask}
              />
            </div>

            {submitError && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            {/* Footer action */}
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
  onPick,
}: {
  suggestedType: 'onboarding' | 'live'
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
          description="9 vragen over mailboxen, Instantly, n8n/Supabase setup, mailopzetjes, clay scenario."
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
          description="13 vragen per campagne over reply rates, leads, mailboxen, schema en variabelen."
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

function OnboardingForm({
  answers,
  onChange,
}: {
  answers: Record<string, string>
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Onboarding checklist" subtitle="Beantwoord elke vraag om door te kunnen." />
      <div className="space-y-3">
        {ONBOARDING_QUESTIONS.map((q, idx) => (
          <QuestionField
            key={q.id}
            number={idx + 1}
            label={q.label}
            value={answers[q.id] ?? ''}
            onChange={(v) => onChange(q.id, v)}
          />
        ))}
      </div>
    </div>
  )
}

function LiveForm({
  numCampaigns,
  answers,
  onSetNumCampaigns,
  onChange,
}: {
  numCampaigns: number | null
  answers: Record<string, string>
  onSetNumCampaigns: (n: number) => void
  onChange: (key: string, value: string) => void
}) {
  return (
    <div className="space-y-4">
      <CampaignCountPicker value={numCampaigns} onChange={onSetNumCampaigns} />

      {numCampaigns !== null && numCampaigns > 0 && (
        <div className="space-y-6">
          {Array.from({ length: numCampaigns }, (_, i) => (
            <div key={i} className="space-y-3">
              <SectionHeader
                title={`Campagne ${i + 1}`}
                subtitle="Beantwoord alle vragen voor deze campagne."
              />
              <div className="space-y-3">
                {LIVE_QUESTIONS.map((q, idx) => {
                  const key = `${i}_${q.id}`
                  return (
                    <QuestionField
                      key={key}
                      number={idx + 1}
                      label={q.label}
                      value={answers[key] ?? ''}
                      onChange={(v) => onChange(key, v)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
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

function QuestionField({
  number,
  label,
  value,
  onChange,
}: {
  number: number
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const filled = value.trim().length > 0
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-colors ${
        filled ? 'border-emerald-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
            filled ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {filled ? (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            number
          )}
        </div>
        <div className="min-w-0 flex-1">
          <label className="text-sm font-semibold text-gray-900">{label}</label>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
            placeholder="Typ je antwoord..."
          />
        </div>
      </div>
    </div>
  )
}

function TasksBlock({
  tasks,
  onChange,
  onAdd,
  onRemove,
}: {
  tasks: string[]
  onChange: (i: number, v: string) => void
  onAdd: () => void
  onRemove: (i: number) => void
}) {
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
            Voeg taken toe op basis van wat je hierboven hebt ingevuld. Lege regels worden niet opgeslagen.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xs font-semibold text-gray-500 shadow-sm ring-1 ring-amber-100">
              {i + 1}
            </div>
            <textarea
              value={task}
              onChange={(e) => onChange(i, e.target.value)}
              rows={1}
              className="flex-1 resize-y rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100"
              placeholder="Beschrijf de taak..."
            />
            {tasks.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
                </svg>
              </button>
            )}
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
