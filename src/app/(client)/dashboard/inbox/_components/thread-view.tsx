'use client'

import { ThreadMessage } from './thread-message'
import { ReplyForm } from './reply-form'

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
  // Most recent email's ID for replying (last in chronological order)
  const lastEmailId =
    emails.length > 0 ? emails[emails.length - 1].instantly_email_id : null

  // Display emails newest first
  const reversedEmails = [...emails].reverse()

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-gray-900">Gesprek</h2>

      <div className="mb-4">
        <ReplyForm
          leadId={leadId}
          senderAccount={senderAccount}
          lastEmailId={lastEmailId}
          replySubject={replySubject}
        />
      </div>

      {emails.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Geen e-mails gevonden. De gespreksgeschiedenis wordt geladen...
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
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
