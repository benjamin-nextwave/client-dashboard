'use client'

import Link from 'next/link'

interface StatsCardsProps {
  unansweredPositive: number
  totalReplies: number
  positiveLeads: number
  emailsSent: number
  periodLabel: string
}

export function StatsCards({
  unansweredPositive,
  totalReplies,
  positiveLeads,
  emailsSent,
  periodLabel,
}: StatsCardsProps) {
  return (
    <div className="space-y-6">
      {/* Alert banner - only shown when there are unanswered positive leads */}
      {unansweredPositive > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-brand p-4 text-white shadow-sm">
          <svg
            className="h-6 w-6 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
          <span className="font-medium">
            {unansweredPositive} actie{unansweredPositive !== 1 ? 's' : ''} vereist
          </span>
          <Link
            href="/dashboard/inbox"
            className="ml-auto text-sm font-medium underline underline-offset-2 hover:opacity-80"
          >
            Bekijk in inbox
          </Link>
        </div>
      )}

      {/* Stat cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Total replies */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Totaal aantal reacties</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{totalReplies}</p>
          <p className="mt-1 text-xs text-gray-400">{periodLabel}</p>
        </div>

        {/* Positive leads (all-time) */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Geleverde leads</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{positiveLeads}</p>
          <p className="mt-1 text-xs text-gray-400">positieve reacties totaal</p>
        </div>

        {/* Emails sent */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Verzonden mails</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{emailsSent}</p>
          <p className="mt-1 text-xs text-gray-400">{periodLabel}</p>
        </div>
      </div>
    </div>
  )
}
