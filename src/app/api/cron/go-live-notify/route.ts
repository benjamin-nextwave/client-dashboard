export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const WEBHOOK_GO_LIVE = 'https://hook.eu2.make.com/jfqtjnbie3ez5fwpjrf7mw5eetczxd15'

/**
 * Go-live notification cron. Designed to run daily at 06:00 Amsterdam time
 * (configure via the same external scheduler that already triggers
 * `/api/cron/morning-check`). Selects every client whose `go_live_date`
 * equals today and whose `go_live_webhook_fired_at` is still NULL, fires
 * the Make webhook once with the client name, and stamps
 * `go_live_webhook_fired_at` so the cron is idempotent on retries.
 *
 * The operator can edit a date back to NULL or move it forward — the
 * `updateGoLiveInfo` action resets the fired-at timestamp on any date
 * change so a re-scheduled go-live still triggers fresh.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  const supabase = createAdminClient()

  // "Today" as a YYYY-MM-DD date string in the server's local time. Vercel
  // serverless runtimes default to UTC; the cron must therefore run at the
  // hour that lines up with 06:00 in the Netherlands (i.e. 04:00 UTC in
  // summer / 05:00 UTC in winter). The scheduler controls timing; this
  // endpoint just resolves "today" the way `getAllTasks` does.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString().slice(0, 10)

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, company_name, go_live_date, go_live_note')
    .eq('go_live_date', todayIso)
    .is('go_live_webhook_fired_at', null)

  if (error) {
    console.error('[go-live-notify] query failed:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }

  const results: Array<{
    clientId: string
    companyName: string
    ok: boolean
    error?: string
  }> = []

  for (const c of clients ?? []) {
    let ok = false
    let errorMsg: string | undefined

    try {
      const res = await fetch(WEBHOOK_GO_LIVE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'client_go_live',
          client_id: c.id,
          client_name: c.company_name,
          go_live_date: c.go_live_date,
          go_live_note: c.go_live_note ?? null,
          timestamp: new Date().toISOString(),
        }),
      })
      ok = res.ok
      if (!ok) errorMsg = `Webhook responded with ${res.status}`
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : 'Webhook fetch failed'
    }

    if (ok) {
      const { error: stampError } = await supabase
        .from('clients')
        .update({ go_live_webhook_fired_at: new Date().toISOString() })
        .eq('id', c.id)
      if (stampError) {
        // Webhook succeeded but we couldn't mark it — log and move on. The
        // next cron run will fire again; operator should not see this in
        // normal operation.
        console.error(
          `[go-live-notify] stamp failed for ${c.id}:`,
          stampError.message
        )
      }
    }

    results.push({
      clientId: c.id,
      companyName: c.company_name,
      ok,
      ...(errorMsg ? { error: errorMsg } : {}),
    })
  }

  return NextResponse.json({
    success: true,
    date: todayIso,
    fired: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    timestamp: new Date().toISOString(),
  })
}
