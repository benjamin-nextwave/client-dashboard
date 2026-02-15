'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
            }}
          >
            Er is iets misgegaan
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#4B5563',
              margin: 0,
            }}
          >
            {error.message || 'Een onverwachte fout is opgetreden.'}
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Opnieuw proberen
          </button>
        </div>
      </body>
    </html>
  )
}
