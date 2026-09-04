import { createAdminClient } from '@/lib/supabase/admin'

/**
 * De drie rapporten die bij een evaluatiemeeting horen.
 *
 * Ze werden gemaakt en per mail rondgestuurd, en waren daarna nergens meer terug
 * te vinden — zeker niet voor Kix, die het gesprek voert. Ze hangen nu aan de
 * meeting: Benjamin uploadt, Kix downloadt vanaf dezelfde dag in de kalender.
 *
 * Aan het cyclusanker en niet aan de meetingdatum: een meeting die verzet wordt
 * houdt dezelfde rapporten, en een nieuwe periode begint met een schone lei.
 */

export type ReportKind = 'month' | 'lead' | 'internal'

export const REPORT_LABELS: Record<ReportKind, string> = {
  month: 'Maandrapport',
  lead: 'Leadrapport',
  internal: 'Intern rapport',
}

export interface MeetingReport {
  id: string
  clientId: string
  cycleAnchor: string
  kind: ReportKind
  fileUrl: string
  filePath: string
  uploadedAt: string
}

function toReport(row: Record<string, unknown>): MeetingReport {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    cycleAnchor: String(row.cycle_anchor).slice(0, 10),
    kind: row.kind as ReportKind,
    fileUrl: row.file_url as string,
    filePath: row.file_path as string,
    uploadedAt: row.uploaded_at as string,
  }
}

/** Alle geüploade rapporten; het overzicht sorteert ze zelf uit per klant. */
export async function getMeetingReports(): Promise<MeetingReport[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('loopgang_meeting_reports')
    .select('id, client_id, cycle_anchor, kind, file_url, file_path, uploaded_at')
    .order('uploaded_at', { ascending: false })
    .limit(1000)

  if (error) {
    console.error(`[loopgang:rapporten] ophalen mislukt: ${error.message}`)
    return []
  }

  return (data ?? []).map((row) => toReport(row as Record<string, unknown>))
}
