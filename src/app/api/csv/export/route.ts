import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const uploadId = searchParams.get('uploadId')

  if (!uploadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploadId)) {
    return Response.json({ error: 'Ongeldig upload ID.' }, { status: 400 })
  }

  // Auth check - only operators
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }

  // Check operator role from JWT
  const { data: { session } } = await supabase.auth.getSession()
  const userRole = session?.access_token
    ? JSON.parse(atob(session.access_token.split('.')[1])).user_role
    : null

  if (userRole !== 'operator') {
    return Response.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Fetch upload metadata
  const { data: upload, error: uploadError } = await admin
    .from('csv_uploads')
    .select('headers, filename, client_id')
    .eq('id', uploadId)
    .single()

  if (uploadError || !upload) {
    return Response.json({ error: 'Upload niet gevonden.' }, { status: 404 })
  }

  const headers = upload.headers as string[]
  const filename = upload.filename as string

  // Fetch all non-filtered rows ordered by row_index
  // Fetch in batches to handle large datasets
  const allRows: Record<string, string>[] = []
  const batchSize = 1000
  let offset = 0

  while (true) {
    const { data: rows, error: rowsError } = await admin
      .from('csv_rows')
      .select('data')
      .eq('upload_id', uploadId)
      .eq('is_filtered', false)
      .order('row_index', { ascending: true })
      .range(offset, offset + batchSize - 1)

    if (rowsError) {
      return Response.json({ error: `Rijen ophalen mislukt: ${rowsError.message}` }, { status: 500 })
    }

    if (!rows || rows.length === 0) break

    for (const row of rows) {
      allRows.push(row.data as Record<string, string>)
    }

    if (rows.length < batchSize) break
    offset += batchSize
  }

  // Generate CSV using PapaParse
  const csvString = Papa.unparse({
    fields: headers,
    data: allRows.map((row) => headers.map((h) => row[h] ?? '')),
  })

  // Generate export filename
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '')
  const exportFilename = `${nameWithoutExt}_gefilterd.csv`

  return new Response(csvString, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFilename}"`,
    },
  })
}
