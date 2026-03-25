'use client'

import { useState, useCallback } from 'react'

interface InboxEmbedFrameProps {
  inboxUrl: string
}

export function InboxEmbedFrame({ inboxUrl }: InboxEmbedFrameProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  const handleLoad = useCallback(() => {
    setIsLoaded(true)
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* Loading state */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand" />
            <p className="text-sm text-gray-500">Inbox laden...</p>
          </div>
        </div>
      )}

      {/* Iframe */}
      <iframe
        src={inboxUrl}
        title="Inbox"
        className={`h-full w-full transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ border: 'none' }}
        onLoad={handleLoad}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
