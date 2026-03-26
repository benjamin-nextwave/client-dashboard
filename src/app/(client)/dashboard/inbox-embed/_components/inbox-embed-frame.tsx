'use client'

import { useState, useCallback } from 'react'

interface InboxEmbedFrameProps {
  proxyBaseUrl: string
}

export function InboxEmbedFrame({ proxyBaseUrl }: InboxEmbedFrameProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [iframeLoaded, setIframeLoaded] = useState(false)

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch(`${proxyBaseUrl}/api/client/login`, {
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
  }, [proxyBaseUrl, email, password])

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
          </div>
        </div>
      </div>
    )
  }

  // Toon iframe na inloggen
  // De container knipt 10% links en 15% boven weg om ongewenste Instantly UI te verbergen
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
        src={`${proxyBaseUrl}/app/unibox`}
        title="Inbox"
        onLoad={() => setIframeLoaded(true)}
        style={{
          border: 'none',
          position: 'absolute',
          top: '-12vh',
          left: '-7vw',
          width: 'calc(100% + 7vw)',
          height: 'calc(100% + 12vh)',
          display: 'block',
          opacity: iframeLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
