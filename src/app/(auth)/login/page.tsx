'use client'

import { useActionState, useState } from 'react'
import { login } from './actions'

const FIELD =
  'auth-field h-11 w-full rounded-control border border-line bg-panel pl-10 pr-3 text-[13.5px] text-fg placeholder:text-faint focus:outline-none'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, { error: '' })
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="auth-rise">
      <h1 className="text-[25px] font-semibold tracking-[-0.01em] text-fg">
        Inloggen
      </h1>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Welkom terug. Log in om verder te gaan naar uw dashboard.
      </p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-[12px] font-medium text-muted"
          >
            E-mailadres
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                <path d="M3 7l9 6 9-6" />
              </svg>
            </span>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={FIELD}
              placeholder="naam@voorbeeld.nl"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-[12px] font-medium text-muted"
          >
            Wachtwoord
          </label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
                <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
              </svg>
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className={`${FIELD} pr-11`}
              placeholder="Uw wachtwoord"
            />
            {/* Wisselt alleen het type van het veld — de ingevoerde waarde en
                de verzending blijven ongemoeid. */}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-control text-faint hover:text-muted"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
                <circle cx="12" cy="12" r="2.75" />
                {showPassword && <path d="M4 20 20 4" />}
              </svg>
            </button>
          </div>
        </div>

        {state?.error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-control border border-line bg-canvas px-3 py-2.5 text-[12.5px] leading-snug text-neg"
          >
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              className="mt-px shrink-0"
            >
              <circle cx="12" cy="12" r="9.25" />
              <path d="M12 7.5v5.25" />
              <path d="M12 16.25h.01" />
            </svg>
            <span>{state.error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-control bg-[var(--brand-color)] text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && (
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              className="animate-spin"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="2.5"
              />
              <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          )}
          {pending ? 'Bezig met inloggen…' : 'Inloggen'}
        </button>
      </form>

      <p className="mt-8 border-t border-line pt-5 text-[11.5px] leading-relaxed text-faint">
        Geen toegang meer tot uw account? Neem contact op met uw vaste
        contactpersoon bij Nextwave.
      </p>
    </div>
  )
}
