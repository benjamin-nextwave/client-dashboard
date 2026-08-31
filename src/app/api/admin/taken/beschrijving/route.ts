export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cleanupTaskDescription } from '@/lib/taken/beschrijving'

/**
 * Voorvertoning van de opgeschoonde beschrijving, zodat je vóór het opslaan
 * ziet wat er komt te staan. Slaat zelf niets op — het opslaan gebeurt in
 * addTask(), die de toelichting nog een keer door dezelfde functie haalt.
 * Daardoor kan er nooit een tekst in de database komen die niet vers uit het
 * model is gerold, ook niet als iemand deze route omzeilt.
 *
 * De middleware laat /api/* ongemoeid, dus de operator-check staat hier zelf.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.user_role !== 'operator') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  let raw: unknown
  try {
    const body = (await req.json()) as { text?: unknown }
    raw = body.text
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek.' }, { status: 400 })
  }

  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'Ongeldig verzoek.' }, { status: 400 })
  }

  const result = await cleanupTaskDescription(raw)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 })
  }

  return NextResponse.json({ text: result.text })
}
