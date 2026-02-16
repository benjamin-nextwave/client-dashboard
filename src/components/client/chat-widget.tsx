'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/react'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/chat' }), [])

  const { messages, sendMessage, status, error } = useChat({ transport })

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  return (
    <>
      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 flex h-[480px] w-[380px] flex-col rounded-xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-xl bg-[var(--brand-color)] px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <span className="text-sm font-semibold">Assistent</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded p-1 hover:bg-white/20"
              aria-label="Sluiten"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-sm text-gray-500 mt-8">
                <p className="font-medium text-gray-700">Hallo!</p>
                <p className="mt-1">
                  Stel me een vraag over uw campagnedata of dashboard.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-[var(--brand-color)] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {m.parts
                      ?.filter((p) => p.type === 'text')
                      .map((p) => p.text)
                      .join('') || ''}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                Er ging iets mis. Probeer het opnieuw.
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Stel een vraag..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-md bg-[var(--brand-color)] px-3 py-2 text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-color)] text-white shadow-lg transition-transform hover:scale-105"
        aria-label="Chat openen"
      >
        {isOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>
    </>
  )
}
