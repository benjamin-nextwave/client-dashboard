export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// De Rompslomp-koppeling loopt door tientallen pagina's boekingen; met de
// standaard tien seconden zou een export over meerdere maanden afbreken.
export const maxDuration = 60

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getExportData } from '@/lib/data/export-data'
import { buildExportWorkbook, buildExportFilename } from '@/lib/export/workbook'
import { EXPORT_SECTIONS, type ExportSection } from '@/lib/export/sections'
import { amsterdamDateString } from '@/lib/commissions-shared'

const SECTION_IDS = EXPORT_SECTIONS.map((s) => s.id) as [ExportSection, ...ExportSection[]]

const BodySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige begindatum.'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ongeldige einddatum.'),
  clientIds: z.array(z.string().uuid()).default([]),
  sections: z.array(z.enum(SECTION_IDS)).min(1, 'Kies minstens één onderwerp.'),
  includeRejected: z.boolean().default(true),
})

/** "2026-08-13 16:42" in Amsterdamse tijd, voor in het bestand en de naam. */
function amsterdamTimestamp(): string {
  const parts = new Intl.DateTimeFormat('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }
  if (user.app_metadata?.user_role !== 'operator') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldig verzoek.' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json({ error: first?.message ?? 'Ongeldige invoer.' }, { status: 400 })
  }

  const { from, to, clientIds, sections, includeRejected } = parsed.data
  if (from > to) {
    return NextResponse.json({ error: 'De begindatum ligt na de einddatum.' }, { status: 400 })
  }

  try {
    const data = await getExportData({ from, to, clientIds, includeRejected })

    const generatedAt = amsterdamTimestamp()
    const workbook = buildExportWorkbook(data, sections, generatedAt)
    const buffer = await workbook.xlsx.writeBuffer()

    const stamp = `${amsterdamDateString()} ${generatedAt.slice(-5).replace(':', '.')}`
    const filename = buildExportFilename(data, stamp)

    console.log(
      `[admin:export] from=${from} to=${to} clients=${clientIds.length || 'alle'} leads=${data.totals.leadCount} sections=${sections.join(',')} status=success`
    )

    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Onbekende fout.'
    console.log(`[admin:export] from=${from} to=${to} status=error error=${message}`)
    return NextResponse.json({ error: `De export is niet gelukt: ${message}` }, { status: 500 })
  }
}
