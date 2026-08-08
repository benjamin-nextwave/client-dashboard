import type { CampaignTask } from '@/lib/data/campaign'

/**
 * Wie er aan zet is. De onboardingpagina groepeert hierop in plaats van op
 * stapnummer: "Nu aan jou" bovenaan, dan "Bij ons", dan "Al afgerond".
 */
export type StepOwner = 'client' | 'nextwave'

export interface OnboardingStep {
  id: string
  number: number
  label: string
  owner: StepOwner
  /** Afgeronde stappen tonen de datum, waar de bron er een heeft. */
  completedAt?: string | null
  href?: string
  optional: boolean
}

export interface OnboardingModel {
  steps: OnboardingStep[]
  done: OnboardingStep[]
  /** Openstaande stappen van de klant — de eerste is de actieve. */
  clientTodo: OnboardingStep[]
  nextwaveTodo: OnboardingStep[]
  completedCount: number
  totalCount: number
  /** Voor de voortgangsstreepjes in de kop. */
  pipStates: ('done' | 'current' | 'todo')[]
  /** Openstaande stappen van de klant die niet optioneel zijn — voedt de kop. */
  requiredLeft: number
}

/**
 * Bouwt het model uit de bestaande `deriveTasks`. Zelfde stappen, zelfde
 * volgorde, zelfde statussen — alleen anders gegroepeerd voor de weergave.
 *
 * `status` is leidend voor "afgerond", niet `completedAt`: stap 1 en 3 hebben
 * geen tijdstempel in de data maar kunnen wel klaar zijn.
 */
export function buildOnboardingModel(tasks: CampaignTask[]): OnboardingModel {
  const steps: OnboardingStep[] = tasks.map((task, i) => ({
    id: task.id,
    number: i + 1,
    label: task.label,
    owner: task.assignee,
    completedAt: task.completedAt ?? null,
    href: task.href,
    optional: task.optional ?? false,
  }))

  const doneIds = new Set(
    tasks.filter((task) => task.status === 'completed').map((task) => task.id)
  )

  const done = steps.filter((s) => doneIds.has(s.id))
  const open = steps.filter((s) => !doneIds.has(s.id))
  const clientTodo = open.filter((s) => s.owner === 'client')
  const nextwaveTodo = open.filter((s) => s.owner === 'nextwave')

  const activeId = tasks.find((task) => task.status === 'current')?.id
  const pipStates = steps.map((s) =>
    doneIds.has(s.id) ? ('done' as const) : s.id === activeId ? ('current' as const) : ('todo' as const)
  )

  return {
    steps,
    done,
    clientTodo,
    nextwaveTodo,
    completedCount: done.length,
    totalCount: steps.length,
    pipStates,
    requiredLeft: clientTodo.filter((s) => !s.optional).length,
  }
}
