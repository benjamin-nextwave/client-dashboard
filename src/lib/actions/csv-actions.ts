'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { CsvUploadMetaSchema, CsvBatchInsertSchema } from '@/lib/validations/csv'

// --- Types ---

type CsvUpload = {
  id: string
  client_id: string
  filename: string
  headers: string[]
  total_rows: number
  email_column: string | null
  contact_date: string | null
  column_mappings: Record<string, string> | null
  uploaded_by: string
  status: string
  created_at: string
  expires_at: string
}

type CsvRow = {
  id: string
  upload_id: string
  row_index: number
  data: Record<string, string>
  is_filtered: boolean
  filter_reason: string | null
}

// --- Server Actions ---

export async function createCsvUpload(input: z.infer<typeof CsvUploadMetaSchema>): Promise<{ uploadId: string } | { error: string }> {
  const parsed = CsvUploadMetaSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const { clientId, filename, headers, totalRows, emailColumn, contactDate, columnMappings } = parsed.data

  // Auth check - only operators
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Niet ingelogd.' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('csv_uploads')
    .insert({
      client_id: clientId,
      filename,
      headers,
      total_rows: totalRows,
      email_column: emailColumn || null,
      contact_date: contactDate || null,
      column_mappings: columnMappings || null,
      uploaded_by: user.id,
      status: 'uploading',
    })
    .select('id')
    .single()

  if (error || !data) {
    return { error: `Upload aanmaken mislukt: ${error?.message ?? 'onbekende fout'}` }
  }

  return { uploadId: data.id }
}

export async function insertCsvBatch(input: z.infer<typeof CsvBatchInsertSchema>): Promise<{ success: true; insertedSoFar: number } | { error: string }> {
  const parsed = CsvBatchInsertSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const { uploadId, startIndex, rows } = parsed.data

  const admin = createAdminClient()

  // Map rows to csv_rows records
  const records = rows.map((row, i) => ({
    upload_id: uploadId,
    row_index: startIndex + i,
    data: row,
  }))

  const { error: insertError } = await admin
    .from('csv_rows')
    .insert(records)

  if (insertError) {
    return { error: `Batch invoegen mislukt: ${insertError.message}` }
  }

  // Count total rows inserted for this upload
  const { count, error: countError } = await admin
    .from('csv_rows')
    .select('*', { count: 'exact', head: true })
    .eq('upload_id', uploadId)

  if (countError) {
    return { error: `Rijen tellen mislukt: ${countError.message}` }
  }

  const insertedSoFar = count ?? 0

  // Check if all rows are uploaded, update status to 'ready'
  const { data: upload } = await admin
    .from('csv_uploads')
    .select('total_rows')
    .eq('id', uploadId)
    .single()

  if (upload && insertedSoFar >= upload.total_rows) {
    await admin
      .from('csv_uploads')
      .update({ status: 'ready' })
      .eq('id', uploadId)
  }

  return { success: true, insertedSoFar }
}

export async function getCsvUploads(clientId: string): Promise<CsvUpload[] | { error: string }> {
  const uuidSchema = z.string().uuid('Ongeldig client ID')
  const parsed = uuidSchema.safeParse(clientId)
  if (!parsed.success) {
    return { error: 'Ongeldig client ID.' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('csv_uploads')
    .select('*')
    .eq('client_id', clientId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    return { error: `Uploads ophalen mislukt: ${error.message}` }
  }

  return (data as CsvUpload[]) ?? []
}

export async function getCsvUploadWithRows(
  uploadId: string,
  page: number = 0
): Promise<{ upload: CsvUpload; rows: CsvRow[]; totalRows: number } | { error: string }> {
  const uuidSchema = z.string().uuid('Ongeldig upload ID')
  const parsed = uuidSchema.safeParse(uploadId)
  if (!parsed.success) {
    return { error: 'Ongeldig upload ID.' }
  }

  const admin = createAdminClient()

  // Fetch upload metadata
  const { data: upload, error: uploadError } = await admin
    .from('csv_uploads')
    .select('*')
    .eq('id', uploadId)
    .single()

  if (uploadError || !upload) {
    return { error: 'Upload niet gevonden.' }
  }

  // Fetch paginated rows (50 per page)
  const pageSize = 50
  const offset = page * pageSize

  const { data: rows, error: rowsError } = await admin
    .from('csv_rows')
    .select('*')
    .eq('upload_id', uploadId)
    .order('row_index', { ascending: true })
    .range(offset, offset + pageSize - 1)

  if (rowsError) {
    return { error: `Rijen ophalen mislukt: ${rowsError.message}` }
  }

  // Get total row count
  const { count } = await admin
    .from('csv_rows')
    .select('*', { count: 'exact', head: true })
    .eq('upload_id', uploadId)

  return {
    upload: upload as CsvUpload,
    rows: (rows as CsvRow[]) ?? [],
    totalRows: count ?? 0,
  }
}

export async function applyDncFilter(
  uploadId: string
): Promise<{ success: true; filtered: number; total: number; emailMatches: number; domainMatches: number } | { error: string }> {
  const uuidSchema = z.string().uuid('Ongeldig upload ID')
  const parsed = uuidSchema.safeParse(uploadId)
  if (!parsed.success) {
    return { error: 'Ongeldig upload ID.' }
  }

  const admin = createAdminClient()

  // Fetch upload metadata
  const { data: upload, error: uploadError } = await admin
    .from('csv_uploads')
    .select('client_id, email_column, total_rows')
    .eq('id', uploadId)
    .single()

  if (uploadError || !upload) {
    return { error: 'Upload niet gevonden.' }
  }

  if (!upload.email_column) {
    return { error: 'Geen e-mailkolom geselecteerd.' }
  }

  const emailColumn = upload.email_column as string
  const clientId = upload.client_id as string

  // Step 1: Reset any previous filtering
  const { error: resetError } = await admin
    .from('csv_rows')
    .update({ is_filtered: false, filter_reason: null })
    .eq('upload_id', uploadId)

  if (resetError) {
    return { error: `Filter resetten mislukt: ${resetError.message}` }
  }

  // Step 2: Fetch all DNC entries for this client
  const { data: dncEntries, error: dncError } = await admin
    .from('dnc_entries')
    .select('entry_type, value')
    .eq('client_id', clientId)

  if (dncError) {
    return { error: `DNC-lijst ophalen mislukt: ${dncError.message}` }
  }

  const dncEmails = new Set<string>()
  const dncDomains = new Set<string>()

  for (const entry of dncEntries ?? []) {
    if (entry.entry_type === 'email') {
      dncEmails.add((entry.value as string).toLowerCase())
    } else if (entry.entry_type === 'domain') {
      dncDomains.add((entry.value as string).toLowerCase())
    }
  }

  // Step 2b: Fetch excluded contacts (client-removed from preview)
  const { data: excludedLeads } = await admin
    .from('synced_leads')
    .select('email')
    .eq('client_id', clientId)
    .eq('is_excluded', true)

  for (const lead of excludedLeads ?? []) {
    dncEmails.add((lead.email as string).toLowerCase())
  }

  // If no DNC entries and no excluded contacts, nothing to filter
  if (dncEmails.size === 0 && dncDomains.size === 0) {
    // Update status to filtered (no matches but filter was applied)
    await admin
      .from('csv_uploads')
      .update({ status: 'filtered' })
      .eq('id', uploadId)

    return { success: true, filtered: 0, total: upload.total_rows, emailMatches: 0, domainMatches: 0 }
  }

  // Step 3: Fetch all csv_rows for this upload (just id and email value)
  // Fetch in batches to handle large datasets
  const batchSize = 1000
  let offset = 0
  const emailMatchIds: string[] = []
  const domainMatchIds: string[] = []

  while (true) {
    const { data: rows, error: rowsError } = await admin
      .from('csv_rows')
      .select('id, data')
      .eq('upload_id', uploadId)
      .range(offset, offset + batchSize - 1)

    if (rowsError) {
      return { error: `Rijen ophalen mislukt: ${rowsError.message}` }
    }

    if (!rows || rows.length === 0) break

    for (const row of rows) {
      const data = row.data as Record<string, string>
      const emailValue = data[emailColumn]
      if (!emailValue) continue

      const email = emailValue.toLowerCase().trim()

      if (dncEmails.has(email)) {
        emailMatchIds.push(row.id as string)
      } else {
        const atIndex = email.indexOf('@')
        if (atIndex !== -1) {
          const domain = email.substring(atIndex + 1)
          if (dncDomains.has(domain)) {
            domainMatchIds.push(row.id as string)
          }
        }
      }
    }

    if (rows.length < batchSize) break
    offset += batchSize
  }

  // Step 4: Batch update matched rows
  const updateBatchSize = 500

  for (let i = 0; i < emailMatchIds.length; i += updateBatchSize) {
    const batch = emailMatchIds.slice(i, i + updateBatchSize)
    const { error: updateError } = await admin
      .from('csv_rows')
      .update({ is_filtered: true, filter_reason: 'email_match' })
      .in('id', batch)

    if (updateError) {
      return { error: `Filter bijwerken mislukt: ${updateError.message}` }
    }
  }

  for (let i = 0; i < domainMatchIds.length; i += updateBatchSize) {
    const batch = domainMatchIds.slice(i, i + updateBatchSize)
    const { error: updateError } = await admin
      .from('csv_rows')
      .update({ is_filtered: true, filter_reason: 'domain_match' })
      .in('id', batch)

    if (updateError) {
      return { error: `Filter bijwerken mislukt: ${updateError.message}` }
    }
  }

  // Step 5: Update upload status to 'filtered'
  await admin
    .from('csv_uploads')
    .update({ status: 'filtered' })
    .eq('id', uploadId)

  const totalFiltered = emailMatchIds.length + domainMatchIds.length

  return {
    success: true,
    filtered: totalFiltered,
    total: upload.total_rows,
    emailMatches: emailMatchIds.length,
    domainMatches: domainMatchIds.length,
  }
}

export async function setEmailColumn(
  uploadId: string,
  emailColumn: string
): Promise<{ success: true } | { error: string }> {
  const uuidSchema = z.string().uuid('Ongeldig upload ID')
  const parsed = uuidSchema.safeParse(uploadId)
  if (!parsed.success) {
    return { error: 'Ongeldig upload ID.' }
  }

  if (!emailColumn || emailColumn.trim().length === 0) {
    return { error: 'E-mailkolom is verplicht.' }
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('csv_uploads')
    .update({ email_column: emailColumn })
    .eq('id', uploadId)

  if (error) {
    return { error: `E-mailkolom bijwerken mislukt: ${error.message}` }
  }

  return { success: true }
}
