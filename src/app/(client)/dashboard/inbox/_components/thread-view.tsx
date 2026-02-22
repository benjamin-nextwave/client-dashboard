'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { refreshThread } from '@/lib/actions/inbox-actions'
import { ThreadMessage } from './thread-message'
import { ReplyForm } from './reply-form'
import { RefreshOverlay } from './refresh-overlay'

interface CachedEmail {
  id: string
  instantly_email_id: string
  thread_id: string
  lead_email: string
  from_address: string
  to_address: string
  subject: string | null
  body_text: string | null
  body_html: string | null
  is_reply: boolean
  sender_account: string | null
  email_timestamp: string | null
  created_at: string
}

interface ThreadViewProps {
  emails: CachedEmail[]
  leadEmail: string
  senderAccount: string
  leadId: string
  replySubject: string | null
}

export function ThreadView({
  emails,
  leadEmail,
  senderAccount,
  leadId,
  replySubject,
}: ThreadViewProps) {
  const [isRefreshing, startRefresh] = useTransition()
  const router = useRouter()

  // Most recent email's ID for replying (last in chronological order)
  const lastEmailId =
    emails.length > 0 ? emails[emails.length - 1].instantly_email_id : null

  // Display emails newest first
  const reversedEmails = [...emails].reverse()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gesprek</h2>
        <button
          type="button"
          onClick={() => {
            startRefresh(async () => {
              await refreshThread(leadId)
              router.refresh()
            })
          }}
          disabled={isRefreshing}
          title="Mist u recente berichten? Klik hier om te verversen."
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isRefreshing ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          <span>{isRefreshing ? 'Verversen...' : 'Verversen'}</span>
        </button>
      </div>

      <div className="mb-4">
        <ReplyForm
          leadId={leadId}
          senderAccount={senderAccount}
          lastEmailId={lastEmailId}
          replySubject={replySubject}
        />
      </div>

      {isRefreshing && (
        <div className="mb-4">
          <RefreshOverlay isRefreshing={isRefreshing} />
        </div>
      )}

      {emails.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Geen e-mails gevonden. De gespreksgeschiedenis wordt geladen...
          </p>
        </div>
      ) : (
        <div className={`rounded-lg border border-gray-200 bg-white p-4 ${isRefreshing ? 'pointer-events-none opacity-40 blur-[1px] transition-all duration-300' : ''}`}>
          <div className="max-h-[60vh] overflow-y-auto">
            {reversedEmails.map((email) => {
              const isFromClient = email.from_address === senderAccount
              return (
                <ThreadMessage
                  key={email.instantly_email_id}
                  fromAddress={email.from_address}
                  toAddress={email.to_address}
                  subject={email.subject}
                  bodyHtml={email.body_html}
                  bodyText={email.body_text}
                  timestamp={email.email_timestamp ?? email.created_at}
                  isFromClient={isFromClient}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
