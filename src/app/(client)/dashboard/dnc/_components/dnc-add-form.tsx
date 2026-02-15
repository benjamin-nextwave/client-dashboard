'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { addDncEmail, addDncDomain } from '@/lib/actions/dnc-actions'

function FeedbackMessage({ message }: { message: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [message])

  if (!visible || !message) return null

  return (
    <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
      {message}
    </div>
  )
}

export function DncAddForm() {
  const [emailState, emailAction, emailPending] = useActionState(addDncEmail, {
    error: '',
  })
  const [domainState, domainAction, domainPending] = useActionState(
    addDncDomain,
    { error: '' }
  )

  const emailRef = useRef<HTMLInputElement>(null)
  const domainRef = useRef<HTMLInputElement>(null)

  // Clear inputs on success
  const prevEmailError = useRef(emailState.error)
  const prevDomainError = useRef(domainState.error)

  useEffect(() => {
    if (prevEmailError.current !== emailState.error && emailState.error === '') {
      if (emailRef.current) emailRef.current.value = ''
    }
    prevEmailError.current = emailState.error
  }, [emailState.error])

  useEffect(() => {
    if (prevDomainError.current !== domainState.error && domainState.error === '') {
      if (domainRef.current) domainRef.current.value = ''
    }
    prevDomainError.current = domainState.error
  }, [domainState.error])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Email form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">
          E-mailadres toevoegen
        </h3>
        <form action={emailAction} className="mt-3 flex gap-2">
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
        {emailState.error && <FeedbackMessage message={emailState.error} />}
      </div>

      {/* Domain form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-medium text-gray-900">
          Domein toevoegen
        </h3>
        <form action={domainAction} className="mt-3 flex gap-2">
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
        {domainState.error && <FeedbackMessage message={domainState.error} />}
      </div>
    </div>
  )
}
