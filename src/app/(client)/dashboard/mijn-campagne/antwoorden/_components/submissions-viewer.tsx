'use client'

import { useState } from 'react'
import type { CampaignFormSubmission } from '@/lib/data/campaign'
import {
  COMPANY_SIZE_LABELS,
  GEO_RADIUS_LABELS,
} from '@/lib/validations/campaign-form'

interface Props {
  submissions: CampaignFormSubmission[]
  fallbackCompanyName: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function SubmissionsViewer({ submissions, fallbackCompanyName }: Props) {
  // Latest first for the selector default
  const ordered = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )
  const [activeId, setActiveId] = useState<string>(ordered[0].id)
  const active = ordered.find((s) => s.id === activeId) ?? ordered[0]
  const activeData = active.data

  const companySizeLabels = activeData.companySizes
    ? activeData.companySizes
        .map((s) => COMPANY_SIZE_LABELS[s])
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <div className="space-y-6">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400/30 to-transparent blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Jouw ingevulde antwoorden
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              {ordered.length === 1
                ? 'Deze antwoorden zijn definitief en kunnen niet meer worden gewijzigd.'
                : `Je hebt het formulier ${ordered.length}× ingediend. Kies hieronder welke je wilt bekijken.`}
            </p>
          </div>
        </div>
      </header>

      {/* Submission selector (only when more than 1) */}
      {ordered.length > 1 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Kies een indiening
          </div>
          <div className="flex flex-wrap gap-2">
            {ordered.map((sub, i) => {
              const isActive = sub.id === activeId
              const label = i === 0 ? 'Meest recent' : `Indiening ${ordered.length - i}`
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setActiveId(sub.id)}
                  className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-all ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm ring-2 ring-indigo-100'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
                  <span className="mt-0.5 text-xs">{formatDate(sub.submittedAt)}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-xs text-gray-600">
        Ingediend op <span className="font-semibold text-gray-900">{formatDate(active.submittedAt)}</span>
      </div>

      <Answer number={1} title="Bedrijfsnaam" value={activeData.companyName ?? fallbackCompanyName} />
      <Answer number={2} title="Afzender van de e-mails" value={activeData.senderName} />

      <Answer number={3} title="Branche of sector">
        {activeData.sectors && activeData.sectors.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {activeData.sectors.map((sector, i) => (
              <li
                key={i}
                className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100"
              >
                {sector}
              </li>
            ))}
          </ul>
        ) : (
          <SkippedLabel />
        )}
      </Answer>

      <Answer number={4} title="Geografisch gebied">
        {activeData.locations && activeData.locations.length > 0 ? (
          <ul className="mt-1 space-y-1.5">
            {activeData.locations.map((loc, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{loc.location}</span>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                  {GEO_RADIUS_LABELS[loc.radiusKm]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <SkippedLabel />
        )}
      </Answer>

      <Answer number={5} title="Bedrijfsgrootte ideale klant" value={companySizeLabels} />
      <Answer number={6} title="Risk Reversal" value={activeData.riskReversal} multiline />
      <Answer number={7} title="Call-to-Action" value={activeData.cta} multiline />
      <Answer number={8} title="Jouw aanbod" value={activeData.offer} multiline />
      <Answer number={9} title="Over jouw bedrijf" value={activeData.aboutCompany} multiline />
      <Answer number={10} title="Voorbeelden of referenties" value={activeData.examples} multiline />
      <Answer number={11} title="Opmerkingen of aanvullingen" value={activeData.comments} multiline />
      <Answer number={12} title="E-mailadres voor positieve reacties" value={activeData.positiveReplyEmail} />

      <Answer number={13} title="Domeinen voor mailboxen">
        {activeData.domainsChoice === null ? (
          <SkippedLabel />
        ) : activeData.domainsChoice === 'nextwave' ? (
          <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 ring-1 ring-indigo-100">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            NextWave kiest de domeinen
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
            {activeData.domainsText || '—'}
          </pre>
        )}
      </Answer>
    </div>
  )
}

function Answer({
  number,
  title,
  value,
  multiline,
  children,
}: {
  number: number
  title: string
  value?: string | null
  multiline?: boolean
  children?: React.ReactNode
}) {
  const hasValue = value !== null && value !== undefined && value !== ''
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-sm font-bold text-gray-600">
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {title}
          </div>
          {children ? (
            <div className="mt-1">{children}</div>
          ) : hasValue ? (
            multiline ? (
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-gray-800">{value}</pre>
            ) : (
              <div className="mt-1 text-sm font-medium text-gray-900">{value}</div>
            )
          ) : (
            <div className="mt-1">
              <SkippedLabel />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function SkippedLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
      Overgeslagen
    </span>
  )
}
