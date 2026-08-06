import { createClient } from '@/lib/supabase/server'
import type { CrmConnectionSummary, CrmCredentials, CrmProvider } from './providers/types'

/**
 * Kolommen inclusief credentials — uitsluitend voor server-side gebruik.
 * Wat naar de browser gaat loopt altijd via toSummary(), die het token maskeert.
 */
export const CONNECTION_COLUMNS = `
  id, provider, name, credentials, last_export_at, last_export_status, last_export_message
`

export type ConnectionRow = {
  id: string
  provider: string
  name: string
  credentials: unknown
  last_export_at: string | null
  last_export_status: string | null
  last_export_message: string | null
}

export function isProvider(value: unknown): value is CrmProvider {
  return value === 'hubspot' || value === 'pipedrive'
}

export function credentialsOf(raw: unknown): CrmCredentials {
  if (typeof raw !== 'object' || raw === null) return { token: '' }
  const obj = raw as Record<string, unknown>
  return {
    token: typeof obj.token === 'string' ? obj.token : '',
    domain: typeof obj.domain === 'string' && obj.domain !== '' ? obj.domain : undefined,
  }
}

function maskToken(token: string): string | null {
  if (!token) return null
  if (token.length <= 4) return '••••'
  return `••••${token.slice(-4)}`
}

function isStatus(value: unknown): value is 'success' | 'partial' | 'error' {
  return value === 'success' || value === 'partial' || value === 'error'
}

export function toSummary(row: ConnectionRow): CrmConnectionSummary {
  const creds = credentialsOf(row.credentials)
  return {
    id: row.id,
    provider: isProvider(row.provider) ? row.provider : 'hubspot',
    name: row.name,
    tokenHint: maskToken(creds.token),
    domain: creds.domain ?? null,
    lastExportAt: row.last_export_at,
    lastExportStatus: isStatus(row.last_export_status) ? row.last_export_status : null,
    lastExportMessage: row.last_export_message,
  }
}

export async function getCrmConnections(
  clientId: string
): Promise<CrmConnectionSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crm_connections')
    .select(CONNECTION_COLUMNS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[crm:connections] fetch error:', error.message)
    return []
  }
  return ((data ?? []) as unknown as ConnectionRow[]).map(toSummary)
}
