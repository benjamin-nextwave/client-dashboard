import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getClientCheckHistory,
  type CheckHistoryAnswer,
  type CheckHistoryRow,
} from '@/lib/data/controle'
import { SKIPPED_ANSWER } from '../../_lib/questions'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export default async function GeschiedenisDetailPage({ params }: PageProps) {
  const { clientId } = await params
  const history = await getClientCheckHistory(clientId)
  if (!history) notFound()

  const accent = history.primaryColor ?? '#0ea5e9'
  const initials = history.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/controle/geschiedenis"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug naar Controle geschiedenis
        </Link>
      </div>

      {/* Client header */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white text-lg font-bold text-white shadow-sm"
          style={history.logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
        >
          {history.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={history.logoUrl} alt={history.companyName} className="h-full w-full object-contain p-1.5" />
          ) : (
            <span className="drop-shadow">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-gray-900">
            {history.companyName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Controles van de afgelopen 5 dagen — {history.checks.length}{' '}
            {history.checks.length === 1 ? 'controle' : 'controles'} totaal
          </p>
        </div>
      </div>

      {history.checks.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">
            Geen controles in de afgelopen 5 dagen voor deze klant.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.checks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      )}
    </div>
  )
}

function CheckCard({ check }: { check: CheckHistoryRow }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              check.checkType === 'onboarding'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}
          >
            {check.checkType === 'onboarding' ? 'Onboarding controle' : 'Live controle'}
          </span>
          {check.checkType === 'live' && check.numCampaigns !== null && (
            <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
              {check.numCampaigns} {check.numCampaigns === 1 ? 'campagne' : 'campagnes'}
            </span>
          )}
        </div>
        <span className="text-[11px] font-semibold text-gray-500">
          {formatDateTime(check.createdAt)}
        </span>
      </div>

      <div className="space-y-4 px-5 py-4">
        {check.checkType === 'onboarding' && check.onboardingQuestions && (
          <AnswerList answers={check.onboardingQuestions} />
        )}
        {check.checkType === 'live' && check.campaigns && (
          <div className="space-y-5">
            {check.campaigns.map((c) => (
              <div key={c.index} className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                  Campagne #{c.index + 1}
                </div>
                <AnswerList answers={c.questions} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AnswerList({ answers }: { answers: CheckHistoryAnswer[] }) {
  if (answers.length === 0) {
    return <p className="text-xs text-gray-400 italic">Geen antwoorden vastgelegd.</p>
  }
  return (
    <ul className="divide-y divide-gray-100">
      {answers.map((a, idx) => (
        <li key={`${a.id}-${idx}`} className="py-2">
          <AnswerRow answer={a} />
        </li>
      ))}
    </ul>
  )
}

function AnswerRow({ answer }: { answer: CheckHistoryAnswer }) {
  const skipped = answer.answer === SKIPPED_ANSWER
  const value = (answer.answer ?? '').trim()
  const empty = !skipped && value.length === 0

  return (
    <div className="grid grid-cols-1 gap-1 md:grid-cols-[1fr_auto]">
      <div className="text-xs font-semibold text-gray-700">{answer.label}</div>
      <div className="md:text-right">
        {skipped ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Overgeslagen
          </span>
        ) : empty ? (
          <span className="text-[11px] italic text-gray-400">geen antwoord</span>
        ) : value === 'Ja' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Ja
          </span>
        ) : value === 'Nee' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Nee
          </span>
        ) : isIsoDate(value) ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            {formatDateShort(value)}
          </span>
        ) : (
          <span className="whitespace-pre-wrap text-xs text-gray-900">{value}</span>
        )}
      </div>
    </div>
  )
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}
