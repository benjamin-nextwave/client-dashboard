'use client'

import { useState } from 'react'
import { submitFeedback } from '@/lib/actions/feedback-actions'
import {
  VARIANT_REASONS,
  VARIANT_REASON_LABELS,
  type FeedbackRequest,
  type VariantReason,
} from '@/lib/data/feedback-types'
import { EmptyState } from '@/components/ui/empty-state'
import { useT } from '@/lib/i18n/client'

type CategoryValue =
  | 'campaign_performance'
  | 'new_mail_variants'
  | 'bug'
  | 'new_feature'
  | 'optimization'
  | 'other'

type CategoryDef = {
  value: CategoryValue
  label: string
  description: string
  group: 'campagne' | 'dashboard'
}

const CATEGORIES: CategoryDef[] = [
  {
    value: 'campaign_performance',
    label: 'Campagne presteert niet goed genoeg',
    description: 'Ik ben niet tevreden over de resultaten van de campagne.',
    group: 'campagne',
  },
  {
    value: 'new_mail_variants',
    label: 'Ik wil nieuwe mailvarianten',
    description: 'De huidige mails moeten aangepast of vervangen worden.',
    group: 'campagne',
  },
  {
    value: 'bug',
    label: 'Er werkt iets niet',
    description: 'Melding van een bug of storing in het dashboard.',
    group: 'dashboard',
  },
  {
    value: 'new_feature',
    label: 'Nieuwe functie',
    description: 'Ik heb een idee voor iets nieuws in het dashboard.',
    group: 'dashboard',
  },
  {
    value: 'optimization',
    label: 'Verbetering',
    description: 'Een bestaande functie kan beter.',
    group: 'dashboard',
  },
  {
    value: 'other',
    label: 'Anders',
    description: 'Overige vraag of opmerking.',
    group: 'dashboard',
  },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label])
)

const CATEGORY_TAG_COLORS: Record<string, string> = {
  campaign_performance: 'bg-emerald-100 text-emerald-700',
  new_mail_variants: 'bg-indigo-100 text-indigo-700',
  bug: 'bg-red-100 text-red-700',
  new_feature: 'bg-purple-100 text-purple-700',
  optimization: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  new: {
    label: 'Nieuw',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: (
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  in_progress: {
    label: 'In behandeling',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: (
      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
      </svg>
    ),
  },
  thinking: {
    label: 'In overweging',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: (
      <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189" />
      </svg>
    ),
  },
  denied: {
    label: 'Afgewezen',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: (
      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    ),
  },
  applied: {
    label: 'Doorgevoerd',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: (
      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
}

export function FeedbackPage({ feedbackRequests }: { feedbackRequests: FeedbackRequest[] }) {
  const t = useT()
  const [category, setCategory] = useState<CategoryValue>('campaign_performance')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [variantReasons, setVariantReasons] = useState<VariantReason[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const toggleReason = (reason: VariantReason) => {
    setVariantReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    const metadata =
      category === 'new_mail_variants' && variantReasons.length > 0
        ? { variant_reasons: variantReasons }
        : null

    const result = await submitFeedback({ category, title, description, metadata })

    if ('error' in result) {
      setFeedback({ type: 'error', message: result.error })
    } else {
      setFeedback({ type: 'success', message: 'Verzoek ingediend!' })
      setTitle('')
      setDescription('')
      setVariantReasons([])
      setCategory('campaign_performance')
    }

    setSubmitting(false)
    setTimeout(() => setFeedback(null), 4000)
  }

  const campagneCats = CATEGORIES.filter((c) => c.group === 'campagne')
  const dashboardCats = CATEGORIES.filter((c) => c.group === 'dashboard')

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('feedback.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('feedback.description')}</p>
      </div>

      {/* Submission Form */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{t('feedback.newRequestTitle')}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{t('feedback.descriptionPlaceholder')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Category — two clearly separated groups */}
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryGroup
              variant="campagne"
              title={t('feedback.categoryCampaignPerformance')}
              description={t('feedback.descriptionPlaceholder')}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              }
              categories={campagneCats}
              selected={category}
              onSelect={setCategory}
            />
            <CategoryGroup
              variant="dashboard"
              title={t('feedback.categoryFeature')}
              description={t('feedback.descriptionPlaceholder')}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                </svg>
              }
              categories={dashboardCats}
              selected={category}
              onSelect={setCategory}
            />
          </div>

          {/* Mail variant reasons — only when relevant */}
          {category === 'new_mail_variants' && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="text-sm font-semibold text-indigo-900">
                {t('feedback.categoryNewMailVariants')}
              </div>
              <p className="mt-0.5 text-xs text-indigo-700">
                {t('feedback.descriptionPlaceholder')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {VARIANT_REASONS.map((reason) => {
                  const active = variantReasons.includes(reason)
                  return (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => toggleReason(reason)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                        active
                          ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                          : 'border-indigo-200 bg-white text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100'
                      }`}
                    >
                      {active && (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                      )}
                      {VARIANT_REASON_LABELS[reason]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Title + Description */}
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                {t('feedback.titleLabel')}
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder={t('feedback.titlePlaceholder')}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                {t('feedback.descriptionLabel')}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={5000}
                rows={5}
                placeholder={
                  category === 'new_mail_variants'
                    ? 'Leg in detail uit wat je anders wilt: toon, inhoud, voorbeelden...'
                    : category === 'campaign_performance'
                      ? 'Wat mis je? Welke cijfers vallen tegen? Wat had je verwacht?'
                      : 'Beschrijf je verzoek zo volledig mogelijk.'
                }
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('feedback.submitting')}
                </>
              ) : (
                <>
                  {t('feedback.submitButton')}
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>

            {feedback && (
              <p
                className={`text-sm font-medium ${
                  feedback.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Past Submissions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{t('feedback.yourRequests')}</h2>
          {feedbackRequests.length > 0 && (
            <span className="text-sm text-gray-400">
              {feedbackRequests.length} verzoek{feedbackRequests.length !== 1 ? 'en' : ''}
            </span>
          )}
        </div>

        {feedbackRequests.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
              </svg>
            }
            title={t('feedback.yourRequests')}
            description={t('feedback.noRequestsYet')}
          />
        ) : (
          <div className="space-y-3">
            {feedbackRequests.map((req) => {
              const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.new
              const catColor = CATEGORY_TAG_COLORS[req.category] ?? CATEGORY_TAG_COLORS.other
              const reasons = req.metadata?.variant_reasons ?? []

              return (
                <div
                  key={req.id}
                  className={`overflow-hidden rounded-xl border ${status.border} ${status.bg}`}
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow-sm">
                          {status.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{req.title}</h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${catColor}`}>
                              {CATEGORY_LABELS[req.category] ?? req.category}
                            </span>
                            <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-white/60 px-2 py-0.5 text-xs text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {reasons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {reasons.map((r) => (
                          <span
                            key={r}
                            className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100"
                          >
                            {VARIANT_REASON_LABELS[r]}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{req.description}</p>
                  </div>

                  {req.operator_response && (
                    <div className="border-t border-white/50 bg-white/60 px-5 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">{t('feedback.operatorReply')}</p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">
                            {req.operator_response}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type GroupVariant = 'campagne' | 'dashboard'

const GROUP_THEME: Record<
  GroupVariant,
  {
    container: string
    iconWrap: string
    iconColor: string
    eyebrow: string
    title: string
    description: string
    activeCard: string
    activeDot: string
    activeLabel: string
    activeDesc: string
    inactiveCard: string
  }
> = {
  campagne: {
    container:
      'relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-orange-50 p-5 shadow-sm',
    iconWrap: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
    iconColor: '',
    eyebrow: 'text-emerald-600',
    title: 'text-emerald-950',
    description: 'text-emerald-800/70',
    activeCard: 'border-emerald-500 bg-white shadow-sm ring-2 ring-emerald-200',
    activeDot: 'border-emerald-500 bg-emerald-500',
    activeLabel: 'text-emerald-950',
    activeDesc: 'text-emerald-800',
    inactiveCard: 'border-emerald-200/60 bg-white/60 hover:border-emerald-300 hover:bg-white',
  },
  dashboard: {
    container:
      'relative overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm',
    iconWrap: 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30',
    iconColor: '',
    eyebrow: 'text-indigo-600',
    title: 'text-indigo-950',
    description: 'text-indigo-800/70',
    activeCard: 'border-indigo-500 bg-white shadow-sm ring-2 ring-indigo-200',
    activeDot: 'border-indigo-500 bg-indigo-500',
    activeLabel: 'text-indigo-950',
    activeDesc: 'text-indigo-800',
    inactiveCard: 'border-indigo-200/60 bg-white/60 hover:border-indigo-300 hover:bg-white',
  },
}

function CategoryGroup({
  variant,
  title,
  description,
  icon,
  categories,
  selected,
  onSelect,
}: {
  variant: GroupVariant
  title: string
  description: string
  icon: React.ReactNode
  categories: CategoryDef[]
  selected: CategoryValue
  onSelect: (v: CategoryValue) => void
}) {
  const theme = GROUP_THEME[variant]
  const glowColor = variant === 'campagne' ? 'from-emerald-300/30' : 'from-indigo-300/30'

  return (
    <section className={theme.container}>
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${glowColor} to-transparent blur-3xl`} />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${theme.iconWrap}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[10px] font-bold uppercase tracking-widest ${theme.eyebrow}`}>
              Categorie
            </div>
            <h3 className={`mt-0.5 text-base font-bold ${theme.title}`}>{title}</h3>
            <p className={`mt-1 text-xs leading-relaxed ${theme.description}`}>{description}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {categories.map((cat) => {
            const active = selected === cat.value
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => onSelect(cat.value)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                  active ? theme.activeCard : theme.inactiveCard
                }`}
              >
                <div
                  className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? theme.activeDot : 'border-gray-300 bg-white'
                  }`}
                >
                  {active && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-semibold ${
                      active ? theme.activeLabel : 'text-gray-900'
                    }`}
                  >
                    {cat.label}
                  </div>
                  <div
                    className={`mt-0.5 text-xs ${active ? theme.activeDesc : 'text-gray-500'}`}
                  >
                    {cat.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
