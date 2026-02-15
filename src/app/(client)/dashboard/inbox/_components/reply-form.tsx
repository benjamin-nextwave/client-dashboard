'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { sendReply } from '@/lib/actions/inbox-actions'

const replySchema = z.object({
  subject: z.string().min(1, 'Onderwerp is verplicht'),
  body: z.string().min(1, 'Bericht is verplicht'),
})

type ReplyFormData = z.infer<typeof replySchema>

interface ReplyFormProps {
  leadId: string
  senderAccount: string
  lastEmailId: string | null
  replySubject: string | null
}

export function ReplyForm({
  leadId,
  senderAccount,
  lastEmailId,
  replySubject,
}: ReplyFormProps) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReplyFormData>({
    resolver: zodResolver(replySchema),
    defaultValues: {
      subject: replySubject ? `Re: ${replySubject}` : '',
      body: '',
    },
  })

  if (!lastEmailId) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">
          Kan niet antwoorden - geen eerdere e-mails gevonden.
        </p>
      </div>
    )
  }

  function onSubmit(data: ReplyFormData) {
    setFeedback(null)
    startTransition(async () => {
      const bodyHtml = `<p>${data.body.replace(/\n/g, '<br>')}</p>`
      const result = await sendReply({
        leadId,
        replyToUuid: lastEmailId!,
        senderAccount,
        subject: data.subject,
        bodyHtml,
      })

      if ('error' in result) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: 'E-mail succesvol verzonden!' })
        reset({ subject: replySubject ? `Re: ${replySubject}` : '', body: '' })
        setTimeout(() => setFeedback(null), 4000)
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-lg border border-gray-200 bg-white p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Antwoorden</h3>

      {feedback && (
        <div
          className={`mb-3 rounded-md px-3 py-2 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="mb-3">
        <label
          htmlFor="reply-subject"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Onderwerp
        </label>
        <input
          id="reply-subject"
          type="text"
          {...register('subject')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.subject && (
          <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>
        )}
      </div>

      <div className="mb-3">
        <label
          htmlFor="reply-body"
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          Bericht
        </label>
        <textarea
          id="reply-body"
          rows={4}
          {...register('body')}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Typ uw antwoord..."
        />
        {errors.body && (
          <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? 'Versturen...' : 'Versturen'}
        </button>
      </div>
    </form>
  )
}
