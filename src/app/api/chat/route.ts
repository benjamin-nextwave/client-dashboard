import { streamText, type UIMessage } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { buildChatSystemPrompt } from '@/lib/data/chat-context'

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(clientId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 10) {
    return false
  }

  entry.count++
  return true
}

/**
 * Convert UIMessage (parts-based) to CoreMessage format (content string)
 * that streamText expects.
 */
function convertMessages(uiMessages: UIMessage[]): { role: 'user' | 'assistant'; content: string }[] {
  return uiMessages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => {
      const text = m.parts
        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
        .map((p) => p.text)
        .join('') ?? ''
      return {
        role: m.role as 'user' | 'assistant',
        content: text,
      }
    })
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get client ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()

    if (!profile?.client_id) {
      return new Response('No client associated', { status: 403 })
    }

    // Rate limit check
    if (!checkRateLimit(profile.client_id)) {
      return new Response('Te veel berichten. Probeer het over een minuut opnieuw.', {
        status: 429,
      })
    }

    const body = await req.json()
    const uiMessages: UIMessage[] = body.messages ?? []

    const messages = convertMessages(uiMessages)

    if (messages.length === 0) {
      return new Response('No messages provided', { status: 400 })
    }

    const systemPrompt = await buildChatSystemPrompt(profile.client_id)

    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      system: systemPrompt,
      messages,
      maxOutputTokens: 1024,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error('[chat] API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
