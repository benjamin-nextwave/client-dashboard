/**
 * De tabel voor de antwoord-assistent komt uit een migratie die de eigenaar
 * zelf draait. Zolang dat niet gebeurd is, moet de inbox gewoon blijven werken
 * en de assistent netjes melden wat eraan schort.
 *
 * Supabase meldt een ontbrekende tabel op twee manieren: Postgres zelf geeft
 * 42P01, maar PostgREST antwoordt meestal met PGRST205 omdat de tabel niet in
 * zijn schema-cache staat. Beide moeten we herkennen.
 */
export function isMissingAssistantTable(error: {
  code?: string | null
  message?: string | null
}): boolean {
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  return (error.message ?? '').includes('lead_inbox_ai_settings')
}

export const ASSISTANT_MIGRATION_HINT =
  'Migratie lead_inbox_ai_settings is nog niet gedraaid — de assistent kan nog niet aan.'
