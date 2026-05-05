'use client'

import { useState } from 'react'
import { ReplyForm } from './reply-form'

export function ReplySection({
  leadId,
  replyToSubject,
  sendingAccount,
  toEmail,
  signature,
}: {
  leadId: string
  replyToSubject: string
  sendingAccount: string
  toEmail: string
  signature: string | null
}) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 8.25H7.5a2.25 2.25 0 0 0-2.25 2.25v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25H15M9 12l3 3m0 0 3-3m-3 3V2.25"
          />
        </svg>
        Reageren
      </button>
    )
  }

  return (
    <ReplyForm
      leadId={leadId}
      replyToSubject={replyToSubject}
      sendingAccount={sendingAccount}
      toEmail={toEmail}
      signature={signature}
      onSent={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  )
}
