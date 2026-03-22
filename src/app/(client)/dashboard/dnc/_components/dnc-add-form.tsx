'use client'

import { useRef, useState } from 'react'
import { addDncEmail, addDncDomain } from '@/lib/actions/dnc-actions'

function FeedbackMessage({ message, type }: { message: string; type: 'error' | 'success' }) {
  if (!message) return null

  return (
    <div
      className={`mt-2 rounded-md p-2 text-sm ${
        type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
      }`}
    >
      {message}
    </div>
  )
}

export function DncAddForm() {
  const emailRef = useRef<HTMLInputElement>(null)
  const domainRef = useRef<HTMLInputElement>(null)
  const [emailPending, setEmailPending] = useState(false)
  const [domainPending, setDomainPending] = useState(false)
  const [emailFeedback, setEmailFeedback] = useState<{ msg: string; type: 'error' | 'success' }>({ msg: '', type: 'error' })
  const [domainFeedback, setDomainFeedback] = useState<{ msg: string; type: 'error' | 'success' }>({ msg: '', type: 'error' })

  async function handleEmailSubmit(formData: FormData) {
    const email = (formData.get('email') as string)?.toLowerCase() ?? ''
    setEmailPending(true)
    setEmailFeedback({ msg: '', type: 'error' })

    const result = await addDncEmail({ error: '' }, formData)

    if (result.error) {
      setEmailFeedback({ msg: result.error, type: 'error' })
    } else {
      // Server action succeeded — trigger webhook via API route
      fetch('/api/dnc-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'single', email }),
      }).catch(() => {})

      if (emailRef.current) emailRef.current.value = ''
      setEmailFeedback({ msg: 'E-mailadres toegevoegd.', type: 'success' })
      setTimeout(() => setEmailFeedback({ msg: '', type: 'error' }), 3000)
    }

    setEmailPending(false)
  }

  async function handleDomainSubmit(formData: FormData) {
    setDomainPending(true)
    setDomainFeedback({ msg: '', type: 'error' })

    const result = await addDncDomain({ error: '' }, formData)

    if (result.error) {
      setDomainFeedback({ msg: result.error, type: 'error' })
    } else {
      if (domainRef.current) domainRef.current.value = ''
      setDomainFeedback({ msg: 'Domein toegevoegd.', type: 'success' })
      setTimeout(() => setDomainFeedback({ msg: '', type: 'error' }), 3000)
    }

    setDomainPending(false)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Email form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">
          E-mailadres toevoegen
        </h3>
        <form action={handleEmailSubmit} className="mt-3 flex gap-2">
          <input
            ref={emailRef}
            type="email"
            name="email"
            placeholder="naam@voorbeeld.nl"
            required
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={emailPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {emailPending ? 'Bezig...' : 'Toevoegen'}
          </button>
        </form>
        {emailFeedback.msg && <FeedbackMessage message={emailFeedback.msg} type={emailFeedback.type} />}
      </div>

      {/* Domain form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">
          Domein toevoegen
        </h3>
        <form action={handleDomainSubmit} className="mt-3 flex gap-2">
          <input
            ref={domainRef}
            type="text"
            name="domain"
            placeholder="voorbeeld.nl"
            required
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={domainPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {domainPending ? 'Bezig...' : 'Toevoegen'}
          </button>
        </form>
        {domainFeedback.msg && <FeedbackMessage message={domainFeedback.msg} type={domainFeedback.type} />}
      </div>
    </div>
  )
}
