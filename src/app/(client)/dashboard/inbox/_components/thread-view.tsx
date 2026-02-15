'use client'

import { useState } from 'react'
import { ThreadMessage } from './thread-message'
import { ReplyForm } from './reply-form'
import { ComposeModal } from './compose-modal'

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
  const [showCompose, setShowCompose] = useState(false)

  const lastEmailId =
    emails.length > 0 ? emails[emails.length - 1].instantly_email_id : null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gesprek</h2>
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Nieuwe Email
        </button>
      </div>

      {emails.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Geen e-mails gevonden. De gespreksgeschiedenis wordt geladen...
          </p>
          <p className="mt-2 text-xs text-gray-400">
            E-mails worden on-demand opgehaald bij het openen van een gesprek.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="max-h-[60vh] overflow-y-auto">
            {emails.map((email) => {
              const isFromClient = email.from_address === senderAccount
              return (
                <ThreadMessage
                  key={email.id}
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

      <div className="mt-4">
        <ReplyForm
          leadId={leadId}
          senderAccount={senderAccount}
          lastEmailId={lastEmailId}
          replySubject={replySubject}
        />
      </div>

      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        leadId={leadId}
        leadEmail={leadEmail}
        senderAccount={senderAccount}
      />
    </div>
  )
}
