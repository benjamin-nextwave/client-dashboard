'use client'

import { useState, useTransition, useActionState } from 'react'
import { login, requestPasswordHelp } from './actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: '' })
  const [email, setEmail] = useState('')
  const [helpPending, startHelp] = useTransition()
  const [helpResult, setHelpResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handlePasswordHelp = () => {
    setHelpResult(null)
    startHelp(async () => {
      const result = await requestPasswordHelp(email)
      if (result.error) {
        setHelpResult({ type: 'error', message: result.error })
      } else {
        setHelpResult({
          type: 'success',
          message: `${result.email} is zojuist gemaild met het wachtwoord en de uitleg om in te loggen.`,
        })
      }
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Inloggen
        </h1>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              E-mailadres
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="naam@voorbeeld.nl"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Wachtwoord
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Uw wachtwoord"
            />
          </div>

          {state?.error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Bezig met inloggen...' : 'Inloggen'}
          </button>
        </form>

        {/* Password help */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={handlePasswordHelp}
            disabled={helpPending || !email}
            className="w-full rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {helpPending ? 'Even geduld...' : 'Wachtwoord vergeten / inloggen lukt niet'}
          </button>

          {helpResult && (
            <div
              className={`mt-3 rounded-md p-3 text-xs ${
                helpResult.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {helpResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
