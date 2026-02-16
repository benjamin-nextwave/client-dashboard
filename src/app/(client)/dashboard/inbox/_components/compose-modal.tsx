'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { composeNewEmail } from '@/lib/actions/inbox-actions'
import type { InboxLead } from '@/lib/data/inbox-data'

const composeSchema = z.object({
  subject: z.string().min(1, 'Onderwerp is verplicht'),
  body: z.string().min(1, 'Bericht is verplicht'),
})

type ComposeFormData = z.infer<typeof composeSchema>

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  leads: InboxLead[]
}

export function ComposeModal({
  isOpen,
  onClose,
  leads,
}: ComposeModalProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedLead, setSelectedLead] = useState<InboxLead | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ComposeFormData>({
    resolver: zodResolver(composeSchema),
    defaultValues: {
      subject: '',
      body: '',
    },
  })

  const handleClose = useCallback(() => {
    setFeedback(null)
    setSelectedLead(null)
    setSearchQuery('')
    reset()
    onClose()
  }, [onClose, reset])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const filteredLeads = leads.filter((lead) => {
    const q = searchQuery.toLowerCase()
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ').toLowerCase()
    return name.includes(q) || lead.email.toLowerCase().includes(q) || (lead.company_name?.toLowerCase().includes(q) ?? false)
  })

  function onSubmit(data: ComposeFormData) {
    if (!selectedLead) return
    setFeedback(null)
    startTransition(async () => {
      const bodyHtml = `<p>${data.body.replace(/\n/g, '<br>')}</p>`
      const result = await composeNewEmail({
        leadEmail: selectedLead.email,
        senderAccount: selectedLead.sender_account ?? '',
        subject: data.subject,
        bodyHtml,
      })

      if ('error' in result) {
        setFeedback({ type: 'error', message: result.error })
      } else {
        setFeedback({ type: 'success', message: 'E-mail succesvol verzonden!' })
        setTimeout(() => handleClose(), 1500)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="relative mx-4 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Sluiten"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="mb-4 text-lg font-semibold text-gray-900">Nieuwe e-mail</h2>

        {!selectedLead ? (
          <div>
            <input
              type="text"
              placeholder="Zoek op naam, e-mail of bedrijf..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
              {filteredLeads.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-500">Geen leads gevonden.</p>
              ) : (
                filteredLeads.map((lead) => {
                  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{name}</p>
                        <p className="truncate text-xs text-gray-500">{lead.email}{lead.company_name ? ` — ${lead.company_name}` : ''}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2">
              <span className="text-xs text-gray-500">Aan:</span>
              <span className="text-sm font-medium text-gray-900">{selectedLead.email}</span>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="ml-auto text-xs text-gray-400 hover:text-gray-600"
              >
                Wijzig
              </button>
            </div>

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

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-3">
                <label htmlFor="compose-subject" className="mb-1 block text-xs font-medium text-gray-600">
                  Onderwerp
                </label>
                <input
                  id="compose-subject"
                  type="text"
                  {...register('subject')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="compose-body" className="mb-1 block text-xs font-medium text-gray-600">
                  Bericht
                </label>
                <textarea
                  id="compose-body"
                  rows={6}
                  {...register('body')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Typ uw bericht..."
                />
                {errors.body && <p className="mt-1 text-xs text-red-600">{errors.body.message}</p>}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isPending ? 'Versturen...' : 'Versturen'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
