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

  const { clientId, filename, headers, totalRows, emailColumn } = parsed.data

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
