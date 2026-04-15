'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { requestInboxPasswordHelp } from '../actions'
import { SAFARI_BANNER_HIDE_EVENT, SAFARI_BANNER_SHOW_EVENT } from '@/components/client/safari-banner'

interface InboxEmbedFrameProps {
  proxyBaseUrl: string
  targetHost: string
}

export function InboxEmbedFrame({ proxyBaseUrl, targetHost }: InboxEmbedFrameProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [helpPending, startHelp] = useTransition()
  const [helpResult, setHelpResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Verberg de Safari-banner zodra de inbox-login gelukt is, zodat de iframe
  // hoger in beeld kan. Zet 'm terug wanneer de component unmount (bv. naar
  // andere pagina navigeren).
  useEffect(() => {
    if (isLoggedIn) {
      window.dispatchEvent(new Event(SAFARI_BANNER_HIDE_EVENT))
    } else {
      window.dispatchEvent(new Event(SAFARI_BANNER_SHOW_EVENT))
    }
    return () => {
      window.dispatchEvent(new Event(SAFARI_BANNER_SHOW_EVENT))
    }
  }, [isLoggedIn])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch(`${proxyBaseUrl}/api/client/login?_target=${targetHost}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok && data.status === 'success') {
        setIsLoggedIn(true)
      } else {
        setError(data.message || 'Inloggen mislukt. Controleer je gegevens.')
      }
    } catch {
      setError('Verbinding mislukt. Probeer het opnieuw.')
    } finally {
      setIsLoading(false)
    }
  }, [proxyBaseUrl, targetHost, email, password])

  // Toon login formulier als niet ingelogd
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="mb-6 text-center">
              <svg className="mx-auto h-10 w-10 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
              <h2 className="mt-3 text-lg font-semibold text-gray-900">E-mail Inbox</h2>
              <p className="mt-1 text-sm text-gray-600">Log in om je inbox te bekijken</p>
            </div>

            <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <strong>Let op:</strong> de login van de inbox heeft niet hetzelfde wachtwoord als het dashboard.
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="inbox-email" className="block text-sm font-medium text-gray-700">
                  E-mailadres
                </label>
                <input
                  id="inbox-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  placeholder="je@email.com"
                />
              </div>

              <div>
                <label htmlFor="inbox-password" className="block text-sm font-medium text-gray-700">
                  Wachtwoord
                </label>
                <input
                  id="inbox-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Inloggen...' : 'Inloggen'}
              </button>
            </form>

            {/* Password help */}
            <div className="mt-5 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  setHelpResult(null)
                  startHelp(async () => {
                    const result = await requestInboxPasswordHelp()
                    if (result.error) {
                      setHelpResult({ type: 'error', message: result.error })
                    } else {
                      setHelpResult({
                        type: 'success',
                        message: `${result.email} is zojuist gemaild met het wachtwoord en de uitleg om in te loggen.`,
                      })
                    }
                  })
                }}
                disabled={helpPending}
                className="w-full rounded-lg border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {helpPending ? 'Even geduld...' : 'Wachtwoord vergeten / inloggen lukt niet'}
              </button>

              {helpResult && (
                <div
                  className={`mt-3 rounded-lg p-3 text-sm ${
                    helpResult.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-red-50 text-red-700 ring-1 ring-red-200'
                  }`}
                >
                  {helpResult.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Toon iframe na inloggen
  return (
    <div className="relative" style={{ height: '100vh', overflow: 'hidden' }}>
      {!iframeLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
            <p className="text-sm text-gray-500">Inbox laden...</p>
          </div>
        </div>
      )}
      <iframe
        src={`${proxyBaseUrl}/app/unibox?_target=${targetHost}`}
        title="Inbox"
        onLoad={() => setIframeLoaded(true)}
        style={{
          border: 'none',
          position: 'absolute',
          top: '-65px',
          left: '-90px',
          // Zoom uit door te schalen; compenseer width/height zodat de iframe
          // nog steeds het volledige zichtbare gebied vult.
          transform: 'scale(0.83)',
          transformOrigin: 'top left',
          width: 'calc(100% / 0.83 + 150px)',
          height: 'calc((100% + 65px) / 0.83)',
          display: 'block',
          opacity: iframeLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
