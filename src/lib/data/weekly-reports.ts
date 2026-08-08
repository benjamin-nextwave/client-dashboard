import { createAdminClient } from '@/lib/supabase/admin'

export type ReportType = 'week' | 'month'

export interface WeeklyReport {
  id: string
  clientId: string
  name: string
  filePath: string
  fileUrl: string
  reportType: ReportType
  createdAt: string
}

const COLUMNS = 'id, client_id, name, file_path, file_url, report_type, created_at'

type Row = {
  id: string
  client_id: string
  name: string
  file_path: string
  file_url: string
  report_type: string | null
  created_at: string
}

function toReport(row: Row): WeeklyReport {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    filePath: row.file_path,
    fileUrl: row.file_url,
    // Rijen van vóór de type-migratie hebben geen waarde: dat zijn weekrapporten.
    reportType: row.report_type === 'month' ? 'month' : 'week',
    createdAt: row.created_at,
  }
}

/**
 * Alle rapporten van een klant, nieuwste eerst — week en maand door elkaar.
 * Gebruikt door de operator-beheerpagina en door de klantpagina "Rapporten",
 * die ze daarna op type splitst.
 */
export async function getWeeklyReports(clientId: string): Promise<WeeklyReport[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_weekly_reports')
    .select(COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return (data as Row[]).map(toReport)
}

/** Dezelfde rapporten, alvast gescheiden per soort. */
export async function getReportsByType(
  clientId: string
): Promise<{ week: WeeklyReport[]; month: WeeklyReport[] }> {
  const all = await getWeeklyReports(clientId)
  return {
    week: all.filter((r) => r.reportType === 'week'),
    month: all.filter((r) => r.reportType === 'month'),
  }
}
