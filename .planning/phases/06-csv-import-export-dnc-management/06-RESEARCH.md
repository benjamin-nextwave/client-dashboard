# Phase 6: CSV Import/Export & DNC Management - Research

**Researched:** 2026-02-15
**Domain:** CSV processing, DNC (Do-Not-Contact) list management, JSONB storage, client-side file parsing
**Confidence:** HIGH

## Summary

Phase 6 introduces two interconnected features: (1) operator CSV upload/export for 7-day preview campaigns, and (2) client-managed DNC (Do-Not-Contact) lists that filter CSV exports. The critical technical challenge is handling 20k+ row CSV files without hitting Vercel timeout or memory limits.

The recommended architecture is: **client-side CSV parsing with PapaParse** in the browser, sending parsed rows in batches to server actions which insert into Supabase with JSONB for preserving original columns. DNC filtering happens at export time via SQL queries that match email addresses and domains against the client's DNC list. The existing `bodySizeLimit: '3mb'` in `next.config.ts` is already configured, which helps but does not eliminate the need for batching -- a 20k-row CSV with many columns can easily exceed 3MB as JSON.

**Primary recommendation:** Parse CSV client-side with PapaParse, batch-insert rows via server actions (500-1000 rows per batch), store original row data as JSONB, and perform DNC filtering with PostgreSQL `split_part()` domain matching at export time.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| papaparse | 5.5.3 | Client-side CSV parsing | De facto standard, handles streaming/large files, no dependencies, RFC 4180 compliant |
| @types/papaparse | latest | TypeScript definitions for PapaParse | Required for TS project |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.25.76 | Schema validation for DNC entries, CSV metadata | Already in project, use for all input validation |
| react-hook-form | 7.71.1 | DNC add forms (email, domain) | Already in project, established pattern |
| @hookform/resolvers | 3.10.0 | Zod resolver for RHF | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse (client-side) | Server-side csv-parse | Would hit Vercel timeout/memory on 20k+ rows; defeats the explicit requirement |
| PapaParse | react-papaparse | Thin React wrapper adds no real value; raw PapaParse is simpler and well-typed |
| JSONB column | Normalized columns | JSONB preserves ALL original columns without knowing schema upfront -- essential requirement |
| Batched server actions | Single large POST | 20k rows as JSON can exceed 3MB limit; batching is safer and shows progress |

**Installation:**
```bash
npm install papaparse @types/papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (operator)/admin/
      clients/[clientId]/
        csv/                    # Operator CSV upload/export pages
          page.tsx              # CSV management page for a client
          _components/
            csv-upload.tsx      # Client component: PapaParse + batch upload
            csv-preview.tsx     # Preview table showing uploaded rows
            csv-export.tsx      # Export button with DNC filtering
    (client)/dashboard/
      dnc/
        page.tsx                # DNC management page (already exists as stub)
        _components/
          dnc-list.tsx          # Current DNC entries table
          dnc-add-email.tsx     # Add single email form
          dnc-add-domain.tsx    # Add domain form
          dnc-csv-upload.tsx    # Bulk CSV upload for DNC
  lib/
    actions/
      csv-actions.ts            # Server actions: batch insert, export, DNC filter
      dnc-actions.ts            # Server actions: add/remove DNC entries, bulk import
    validations/
      csv.ts                    # Zod schemas for CSV metadata, batch payloads
      dnc.ts                    # Zod schemas for DNC entries
```

### Pattern 1: Client-Side CSV Parsing with Batched Upload
**What:** Parse CSV in browser with PapaParse, then send rows to server in batches of 500-1000
**When to use:** Any CSV upload that may exceed 1000 rows or 1MB
**Example:**
```typescript
// csv-upload.tsx (client component)
'use client'
import Papa from 'papaparse'

function handleFileUpload(file: File, clientId: string) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data as Record<string, string>[]
      const BATCH_SIZE = 500

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        await insertCsvBatch({
          clientId,
          batchIndex: Math.floor(i / BATCH_SIZE),
          rows: batch,
          totalRows: rows.length,
          headers: results.meta.fields ?? [],
        })
        // Update progress: (i + batch.length) / rows.length
      }
    },
    error: (error) => {
      // Handle parse error
    },
  })
}
```

### Pattern 2: JSONB Row Storage
**What:** Store each CSV row's original data in a JSONB column, preserving all columns regardless of schema
**When to use:** When CSV column structure is unknown/variable and must be preserved exactly
**Example:**
```sql
-- csv_uploads table stores metadata about the upload
CREATE TABLE public.csv_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  headers JSONB NOT NULL,           -- ["Email", "Naam", "Bedrijf", ...]
  total_rows INTEGER NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'uploading'
    CHECK (status IN ('uploading', 'ready', 'filtered', 'exported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- csv_rows stores individual rows with JSONB data
CREATE TABLE public.csv_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id UUID NOT NULL REFERENCES public.csv_uploads(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,              -- {"Email": "jan@example.nl", "Naam": "Jan", ...}
  is_filtered BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = removed by DNC
  filter_reason TEXT,               -- 'email_match', 'domain_match', 'client_removed'
  UNIQUE(upload_id, row_index)
);

CREATE INDEX idx_csv_rows_upload_id ON public.csv_rows(upload_id);
CREATE INDEX idx_csv_rows_data_email ON public.csv_rows USING gin(data);
```

### Pattern 3: DNC List with Email + Domain Separation
**What:** Store DNC entries in a single table with a `type` discriminator
**When to use:** DNC management where both individual emails and entire domains can be blocked
**Example:**
```sql
CREATE TABLE public.dnc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('email', 'domain')),
  value TEXT NOT NULL,              -- "jan@example.nl" or "example.nl"
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, entry_type, value)
);

CREATE INDEX idx_dnc_entries_client ON public.dnc_entries(client_id);
CREATE INDEX idx_dnc_entries_lookup ON public.dnc_entries(client_id, entry_type, value);
```

### Pattern 4: DNC Filtering at Export Time via SQL
**What:** Use PostgreSQL to match CSV row emails against DNC emails and domains using `split_part()`
**When to use:** When operator clicks "Apply DNC filter" before export
**Example:**
```sql
-- Mark rows as filtered based on DNC matches
UPDATE csv_rows r
SET is_filtered = TRUE,
    filter_reason = CASE
      WHEN d_email.id IS NOT NULL THEN 'email_match'
      WHEN d_domain.id IS NOT NULL THEN 'domain_match'
      ELSE 'client_removed'
    END
FROM csv_uploads u
LEFT JOIN dnc_entries d_email
  ON d_email.client_id = u.client_id
  AND d_email.entry_type = 'email'
  AND lower(r.data ->> 'Email') = lower(d_email.value)
LEFT JOIN dnc_entries d_domain
  ON d_domain.client_id = u.client_id
  AND d_domain.entry_type = 'domain'
  AND lower(split_part(r.data ->> 'Email', '@', 2)) = lower(d_domain.value)
WHERE r.upload_id = u.id
  AND u.id = $1
  AND (d_email.id IS NOT NULL OR d_domain.id IS NOT NULL);
```

### Pattern 5: CSV Export from Filtered Data
**What:** Generate CSV from non-filtered rows, preserving original column order
**When to use:** When operator exports cleaned CSV
**Example:**
```typescript
// Server action or API route for CSV export
async function exportFilteredCsv(uploadId: string) {
  const admin = createAdminClient()

  // Get upload metadata for headers
  const { data: upload } = await admin
    .from('csv_uploads')
    .select('headers, client_id')
    .eq('id', uploadId)
    .single()

  // Get non-filtered rows
  const { data: rows } = await admin
    .from('csv_rows')
    .select('data')
    .eq('upload_id', uploadId)
    .eq('is_filtered', false)
    .order('row_index')

  // Convert to CSV using PapaParse unparse
  const csv = Papa.unparse({
    fields: upload.headers,
    data: rows.map(r => r.data),
  })

  return csv
}
```

### Anti-Patterns to Avoid
- **Sending entire CSV file through server action FormData:** Will hit 3MB body limit or Vercel timeouts on large files. Always parse client-side and batch.
- **Storing CSV as a single blob in Supabase Storage:** Makes DNC filtering impossible without re-downloading and re-parsing the entire file.
- **Running DNC filter in JavaScript:** Use SQL for matching -- it is orders of magnitude faster for 20k rows against potentially thousands of DNC entries.
- **Creating separate columns for each CSV field:** CSV schemas vary per upload; JSONB is the only way to preserve all original columns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Custom delimiter/quote handling | PapaParse | Edge cases with quotes, newlines in fields, BOM encoding, different delimiters |
| CSV generation | Manual string concatenation | PapaParse `unparse()` | Same edge cases in reverse -- proper escaping of special characters |
| Email validation | Custom regex | Zod `.email()` | Already in project, handles edge cases |
| Domain extraction | Custom string splitting | PostgreSQL `split_part(email, '@', 2)` | SQL-level is faster and more reliable for bulk operations |
| Progress tracking | Custom WebSocket | React state + batch callbacks | Batched uploads naturally provide progress (batch N of M) |
| File type detection | File extension check | PapaParse error handling + `file.type` check | PapaParse gracefully handles malformed input |

## Common Pitfalls

### Pitfall 1: CSV Email Column Name Variance
**What goes wrong:** CSVs from different sources use "Email", "email", "E-mail", "email_address" etc.
**Why it happens:** No standard column naming across CSV exports from different tools.
**How to avoid:** After parsing headers, do case-insensitive matching to find the email column. Present a dropdown to the operator to confirm which column contains emails if auto-detection fails.
**Warning signs:** DNC filtering returns 0 matches on a CSV that should have matches.

### Pitfall 2: Server Action Body Size on Large Batches
**What goes wrong:** Even with batching, a batch of 1000 rows with many wide columns can exceed 3MB.
**Why it happens:** JSONB serialization of row data with many columns is verbose.
**How to avoid:** Use batch size of 500 rows as default. If a single row has many columns (20+), reduce to 200-300.
**Warning signs:** "Body exceeded limit" errors in production.

### Pitfall 3: Race Condition on Batch Upload Status
**What goes wrong:** Upload status set to "ready" before all batches complete.
**Why it happens:** Last batch callback fires but earlier batches haven't committed yet.
**How to avoid:** Track total_rows_inserted on the upload record. Only set status to "ready" when total_rows_inserted equals total_rows. Use a server action that checks this after each batch.
**Warning signs:** Preview shows fewer rows than expected.

### Pitfall 4: Case Sensitivity in DNC Matching
**What goes wrong:** "Jan@Example.nl" doesn't match DNC entry "jan@example.nl".
**Why it happens:** PostgreSQL text comparison is case-sensitive by default.
**How to avoid:** Always use `lower()` on both sides of email/domain comparisons. Store DNC values as lowercase. Normalize email column values with `lower()` during filtering.
**Warning signs:** Users report DNC entries being "ignored".

### Pitfall 5: 7-Day Expiry Not Enforced
**What goes wrong:** Old CSV uploads accumulate in the database, wasting storage.
**Why it happens:** No automated cleanup mechanism.
**How to avoid:** Use `expires_at` column + a Supabase pg_cron job or a Next.js cron route (like the existing `/api/cron/sync-instantly`) that deletes expired uploads. CASCADE on csv_rows handles row cleanup.
**Warning signs:** Database size grows continuously.

### Pitfall 6: Operator Needs Client Context for CSV Operations
**What goes wrong:** Operator uploads CSV but it is not scoped to the correct client.
**Why it happens:** Operator manages multiple clients; the CSV upload must be client-specific.
**How to avoid:** CSV upload page must be nested under `/admin/clients/[clientId]/csv`. The clientId comes from the URL params, not from user selection.
**Warning signs:** CSV rows associated with wrong client.

## Code Examples

### PapaParse Client-Side Parse with Progress
```typescript
// Source: PapaParse docs (https://www.papaparse.com/docs)
import Papa from 'papaparse'

interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  errors: Papa.ParseError[]
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete(results) {
        resolve({
          headers: results.meta.fields ?? [],
          rows: results.data as Record<string, string>[],
          errors: results.errors,
        })
      },
      error(error) {
        reject(error)
      },
    })
  })
}
```

### PapaParse CSV Generation (Unparse)
```typescript
// Source: PapaParse docs (https://www.papaparse.com/docs)
import Papa from 'papaparse'

export function generateCsv(
  headers: string[],
  rows: Record<string, unknown>[]
): string {
  return Papa.unparse({
    fields: headers,
    data: rows,
  })
}
```

### Batch Insert Server Action
```typescript
'use server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const BatchInsertSchema = z.object({
  uploadId: z.string().uuid(),
  startIndex: z.number().int().min(0),
  rows: z.array(z.record(z.string())).min(1).max(1000),
})

export async function insertCsvBatch(input: z.infer<typeof BatchInsertSchema>) {
  const parsed = BatchInsertSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Ongeldige batch data.' }
  }

  const { uploadId, startIndex, rows } = parsed.data
  const admin = createAdminClient()

  const csvRows = rows.map((data, i) => ({
    upload_id: uploadId,
    row_index: startIndex + i,
    data,
  }))

  const { error } = await admin.from('csv_rows').insert(csvRows)

  if (error) {
    return { error: `Batch insert mislukt: ${error.message}` }
  }

  // Update inserted count
  const { count } = await admin
    .from('csv_rows')
    .select('id', { count: 'exact', head: true })
    .eq('upload_id', uploadId)

  return { success: true, insertedCount: count }
}
```

### DNC Add Entry Server Action
```typescript
'use server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const AddDncEmailSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
})

const AddDncDomainSchema = z.object({
  domain: z.string()
    .min(3, 'Domein is te kort')
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Ongeldig domein'),
})

export async function addDncEmail(prevState: { error: string }, formData: FormData) {
  const parsed = AddDncEmailSchema.safeParse({
    email: formData.get('email'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id
  if (!clientId) return { error: 'Geen klant gekoppeld.' }

  const { error } = await supabase.from('dnc_entries').insert({
    client_id: clientId,
    entry_type: 'email',
    value: parsed.data.email.toLowerCase(),
    added_by: user.id,
  })

  if (error?.code === '23505') {
    return { error: 'Dit e-mailadres staat al op de DNC-lijst.' }
  }
  if (error) {
    return { error: `Toevoegen mislukt: ${error.message}` }
  }

  revalidatePath('/dashboard/dnc')
  return { error: '' }
}
```

### RLS Policies Pattern
```sql
-- DNC entries: clients manage their own, operators can read all
CREATE POLICY "Clients manage own DNC entries" ON public.dnc_entries
  FOR ALL TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'))
  WITH CHECK (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

CREATE POLICY "Operators can view all DNC entries" ON public.dnc_entries
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- CSV uploads: operators manage, clients have no access
CREATE POLICY "Operators manage CSV uploads" ON public.csv_uploads
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Operators manage CSV rows" ON public.csv_rows
  FOR ALL TO authenticated
  USING (
    upload_id IN (
      SELECT id FROM public.csv_uploads
      WHERE TRUE  -- operator check already on csv_uploads
    )
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  )
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side CSV parsing | Client-side parsing + batched upload | Vercel serverless era | Avoids timeout/memory limits entirely |
| Storing CSV files as blobs | JSONB per-row storage | - | Enables SQL-level filtering and querying |
| Next.js API routes for file upload | Server actions with bodySizeLimit config | Next.js 14+ | Simpler code, built-in CSRF protection |
| Custom CSV parsing code | PapaParse 5.5.x | Mature library | Handles all edge cases, RFC 4180 compliant |

**Key notes:**
- Next.js `bodySizeLimit` is already set to `'3mb'` in the project's `next.config.ts` -- no change needed
- The DNC page stub already exists at `/dashboard/dnc/page.tsx` -- just needs implementation
- The sidebar already includes a DNC nav item

## Open Questions

1. **Email Column Auto-Detection**
   - What we know: CSVs use various column names for email fields
   - What's unclear: Should we require a specific column name or auto-detect?
   - Recommendation: Auto-detect with case-insensitive matching against common names ("email", "e-mail", "email_address", "emailaddress"), with operator override dropdown

2. **DNC Filtering of "Client-Removed" Contacts**
   - What we know: OADM-05 mentions "client-removed contacts" as a DNC filter category
   - What's unclear: Where are "client-removed" contacts tracked? Is this a separate concept from the DNC list?
   - Recommendation: Add a `removed_leads` table or a `is_removed` flag on `synced_leads`. When a client marks a lead as "removed" from their inbox/contact list, this should be tracked and applied during CSV DNC filtering.

3. **Large Export Downloads**
   - What we know: Filtered CSV needs to be downloadable with all original columns
   - What's unclear: Should export be a streaming download or generate-then-download?
   - Recommendation: For 20k rows, generate the full CSV string server-side and return as a download. PapaParse `unparse()` can handle this size in memory. Use an API route (not server action) for the download response with proper Content-Disposition headers.

4. **Cleanup of Expired Uploads**
   - What we know: 7-day preview implies uploads should expire
   - What's unclear: Automated cleanup mechanism
   - Recommendation: Add a cron endpoint similar to existing `/api/cron/sync-instantly` that deletes expired CSV uploads. CASCADE deletes handle csv_rows automatically.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `next.config.ts` confirms `bodySizeLimit: '3mb'`
- Existing codebase: Server action patterns in `src/app/(operator)/admin/clients/actions.ts`
- Existing codebase: RLS policy patterns in migration files
- [PapaParse npm](https://www.npmjs.com/package/papaparse) - version 5.5.3, feature set
- [PapaParse official docs](https://www.papaparse.com/) - API reference, streaming, header handling
- [Next.js serverActions config](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) - bodySizeLimit documentation

### Secondary (MEDIUM confidence)
- [Supabase bulk insert discussion](https://github.com/orgs/supabase/discussions/11349) - batch size recommendations (500-1000 rows)
- [Supabase JSONB docs](https://supabase.com/docs/guides/database/json) - JSONB storage patterns
- [PostgreSQL split_part](https://w3resource.com/PostgreSQL/split_part-function.php) - email domain extraction

### Tertiary (LOW confidence)
- [Vercel timeout workarounds](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts) - general patterns, not verified for this specific use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PapaParse is well-established, codebase patterns are clear
- Architecture: HIGH - JSONB storage pattern is well-documented, batching approach is proven
- Database schema: HIGH - Follows existing codebase conventions (RLS, UUID PKs, timestamps)
- DNC filtering: MEDIUM - SQL approach is sound but "client-removed contacts" concept needs clarification
- Pitfalls: HIGH - Based on known Vercel/Next.js limitations and PostgreSQL behavior

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable domain, 30 days)
