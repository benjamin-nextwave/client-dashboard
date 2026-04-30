# Phase 2: Operator Admin Core - Research

**Researched:** 2026-02-15
**Domain:** Supabase Admin API (user provisioning), Supabase Storage (logo uploads), Instantly.ai API v2 (campaign listing), Next.js Server Actions (form handling)
**Confidence:** HIGH

## Summary

Phase 2 builds the operator admin interface for creating and managing client accounts. This involves four technical domains: (1) creating Supabase auth users programmatically via the Admin API with `service_role` key, (2) uploading and storing client logos in Supabase Storage with tenant-scoped RLS policies, (3) fetching available campaigns from the Instantly.ai API v2 for operator selection, and (4) building multi-step forms with server-side validation using Server Actions and Zod.

The existing Phase 1 foundation provides the database schema (`clients` and `profiles` tables with RLS), the admin Supabase client (`src/lib/supabase/admin.ts`), and the operator route group (`src/app/(operator)/`). Phase 2 extends this with a `client_campaigns` junction table, a Supabase Storage bucket for logos, and the operator admin pages for client CRUD operations.

The critical architectural decision is that client creation must be a transactional operation: create the auth user, insert the profile record, insert the client record, and upload the logo -- all coordinated in a single Server Action using the admin client. If any step fails, the previous steps should be rolled back or cleaned up to avoid orphaned records.

**Primary recommendation:** Use Server Actions with the admin Supabase client for all operator mutations. Store logos in a private Supabase Storage bucket with RLS policies scoped by `client_id` folder paths. Fetch Instantly.ai campaigns via a server-side API call using Bearer token auth against the v2 API. Validate all form inputs with Zod schemas shared between client and server.

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.95.3 | Admin API for user creation, Storage API for logo upload | Already in project; admin client pattern established in Phase 1 |
| @supabase/ssr | ^0.8.0 | Server-side auth context in Server Actions | Already in project |
| Next.js | 15.5.12 | App Router, Server Actions, route groups | Already in project |

### New for Phase 2
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^3.24 | Form validation schemas (client creation, editing) | All Server Action inputs; shared between client-side preview and server validation |
| React Hook Form | ^7.54 | Form state management for complex multi-field forms | Client creation form with many fields (name, email, password, color, recruitment toggle, meeting URL) |
| @hookform/resolvers | ^3.9 | Connects Zod schemas to React Hook Form | Automatic client-side validation using the same Zod schema as the server |

**Note on Zod version:** Use Zod v3 (not v4). Zod v4 was released recently and the ecosystem (especially @hookform/resolvers) has not fully migrated. Zod v3 is the stable, well-supported choice.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Hook Form + Zod | Plain useActionState + manual validation | useActionState is already used for login; RHF adds better UX for complex forms with many fields, real-time validation, and field-level error display. Worth the dependency for the client creation form. |
| Supabase Storage for logos | Cloudinary or S3 | Supabase Storage integrates with existing RLS policies and requires no additional service. Logos are small files, no CDN optimization needed at 15-client scale. |
| Server-side Instantly API call | Client-side API call | API key must never be exposed to browser. Server-side only. |

**Installation:**
```bash
npm install zod react-hook-form @hookform/resolvers
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
src/
├── app/
│   ├── (operator)/
│   │   ├── admin/
│   │   │   ├── page.tsx                    # Client list (update existing placeholder)
│   │   │   ├── clients/
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx            # Create client form
│   │   │   │   └── [clientId]/
│   │   │   │       └── edit/
│   │   │   │           └── page.tsx        # Edit client form
│   │   │   └── actions.ts                  # Server Actions for client CRUD
│   │   └── layout.tsx                      # (existing)
├── lib/
│   ├── supabase/
│   │   ├── admin.ts                        # (existing) service_role client
│   │   └── storage.ts                      # NEW: Storage helpers for logo upload
│   ├── instantly/
│   │   ├── client.ts                       # NEW: Instantly API v2 wrapper
│   │   └── types.ts                        # NEW: Instantly API response types
│   └── validations/
│       └── client.ts                       # NEW: Zod schemas for client forms
├── components/
│   └── admin/
│       ├── client-form.tsx                 # NEW: Shared create/edit form component
│       ├── client-list.tsx                 # NEW: Client overview table
│       ├── campaign-selector.tsx           # NEW: Multi-select for Instantly campaigns
│       ├── logo-upload.tsx                 # NEW: Logo file upload with preview
│       └── color-picker.tsx                # NEW: Primary color picker input
└── types/
    └── database.ts                         # NEW: Extended types for client_campaigns
supabase/
├── migrations/
│   └── 20260216000001_client_campaigns_and_storage.sql  # NEW: Junction table + storage bucket + RLS
```

### Pattern 1: Transactional Client Creation via Server Action
**What:** A Server Action that creates a client record, auth user, profile, and uploads the logo as a coordinated operation with error cleanup.
**When to use:** Client creation and editing forms.

```typescript
// src/app/(operator)/admin/clients/actions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { clientFormSchema } from '@/lib/validations/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createClient(prevState: { error: string }, formData: FormData) {
  const supabase = createAdminClient()

  // 1. Validate input with Zod
  const raw = Object.fromEntries(formData.entries())
  const parsed = clientFormSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }
  const { companyName, email, password, primaryColor, isRecruitment, meetingUrl } = parsed.data

  // 2. Create client record first (need the ID for profile + storage)
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      company_name: companyName,
      primary_color: primaryColor,
      is_recruitment: isRecruitment,
      meeting_url: meetingUrl || null,
    })
    .select('id')
    .single()

  if (clientError) return { error: `Klant aanmaken mislukt: ${clientError.message}` }

  // 3. Create auth user with role claims
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // Skip verification for operator-provisioned accounts
    app_metadata: {
      user_role: 'client',
      client_id: client.id,
    },
  })

  if (authError) {
    // Cleanup: remove the client record
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: `Gebruiker aanmaken mislukt: ${authError.message}` }
  }

  // 4. Create profile record
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      user_role: 'client',
      client_id: client.id,
      display_name: companyName,
    })

  if (profileError) {
    // Cleanup: remove auth user and client
    await supabase.auth.admin.deleteUser(authUser.user.id)
    await supabase.from('clients').delete().eq('id', client.id)
    return { error: `Profiel aanmaken mislukt: ${profileError.message}` }
  }

  // 5. Handle logo upload (if provided) - see Pattern 3
  // 6. Handle campaign associations (if selected) - see Pattern 4

  revalidatePath('/admin')
  redirect('/admin')
}
```

### Pattern 2: Zod Schema for Client Form Validation
**What:** Shared validation schema between client-side React Hook Form and server-side Server Action.
**When to use:** Client creation and editing forms.

```typescript
// src/lib/validations/client.ts
import { z } from 'zod'

export const clientFormSchema = z.object({
  companyName: z.string().min(1, 'Bedrijfsnaam is verplicht').max(100),
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens bevatten'),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Ongeldige kleurcode'),
  isRecruitment: z.coerce.boolean().default(false),
  meetingUrl: z.string().url('Ongeldige URL').optional().or(z.literal('')),
})

// For editing: password is optional, email changes use updateUserById
export const clientEditSchema = clientFormSchema.omit({ password: true }).extend({
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens bevatten').optional().or(z.literal('')),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>
export type ClientEditValues = z.infer<typeof clientEditSchema>
```

### Pattern 3: Logo Upload via Supabase Storage
**What:** Upload client logos to a private Supabase Storage bucket with tenant-scoped folder paths.
**When to use:** During client creation or when editing branding.

**Approach:** Use the admin client (service_role) for logo uploads in Server Actions. This bypasses storage RLS and is appropriate because only operators upload logos. For serving logos to client dashboards, use signed URLs or make the bucket public (logos are not sensitive).

```typescript
// src/lib/supabase/storage.ts
import { createAdminClient } from './admin'

const LOGO_BUCKET = 'client-logos'
const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']

export async function uploadClientLogo(
  clientId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  // Validate file
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'Alleen PNG, JPEG, SVG of WebP bestanden zijn toegestaan' }
  }
  if (file.size > MAX_LOGO_SIZE) {
    return { error: 'Logo mag maximaal 2MB zijn' }
  }

  const supabase = createAdminClient()
  const ext = file.name.split('.').pop()
  const path = `${clientId}/logo.${ext}`

  // Upload (upsert to overwrite existing logo)
  const { error } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true })

  if (error) return { error: `Upload mislukt: ${error.message}` }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(path)

  return { url: urlData.publicUrl }
}

export async function deleteClientLogo(clientId: string): Promise<void> {
  const supabase = createAdminClient()
  // List all files in the client's folder
  const { data: files } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(clientId)

  if (files && files.length > 0) {
    const paths = files.map(f => `${clientId}/${f.name}`)
    await supabase.storage.from(LOGO_BUCKET).remove(paths)
  }
}
```

### Pattern 4: Instantly.ai Campaign Fetching
**What:** Server-side API call to fetch available campaigns from Instantly.ai v2 API.
**When to use:** When operator opens the campaign selector in the client creation/edit form.

```typescript
// src/lib/instantly/client.ts
const INSTANTLY_API_BASE = 'https://api.instantly.ai/api/v2'

interface InstantlyCampaign {
  id: string
  name: string
  status: number  // 1 = active, 0 = paused, etc.
}

interface ListCampaignsResponse {
  items: InstantlyCampaign[]
  next_starting_after?: string
}

export async function listCampaigns(options?: {
  search?: string
  status?: number
  limit?: number
  startingAfter?: string
}): Promise<ListCampaignsResponse> {
  const params = new URLSearchParams()
  if (options?.search) params.set('search', options.search)
  if (options?.status !== undefined) params.set('status', String(options.status))
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.startingAfter) params.set('starting_after', options.startingAfter)

  const response = await fetch(
    `${INSTANTLY_API_BASE}/campaigns?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // No caching for campaign list -- operator needs fresh data
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(`Instantly API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

### Pattern 5: Campaign Association Junction Table
**What:** A `client_campaigns` table linking clients to their Instantly.ai campaigns.
**When to use:** Storing which campaigns belong to which client.

```sql
-- Migration: client_campaigns junction table
CREATE TABLE public.client_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,          -- Instantly.ai campaign UUID (stored as text)
  campaign_name TEXT NOT NULL,        -- Cached name for display without API calls
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, campaign_id)     -- Prevent duplicate associations
);

ALTER TABLE public.client_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_campaigns_client_id ON public.client_campaigns(client_id);

-- Operators can manage all campaign associations
CREATE POLICY "Operators can manage campaign associations" ON public.client_campaigns
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can view their own campaign associations
CREATE POLICY "Clients can view own campaigns" ON public.client_campaigns
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));
```

### Anti-Patterns to Avoid
- **Creating auth user before client record:** The client record ID is needed for the profile's `client_id` and the storage folder path. Always create the client record first, then the auth user, then the profile.
- **Storing Instantly.ai API key in NEXT_PUBLIC_ variable:** The API key must only be in server-side env vars. Never prefix with `NEXT_PUBLIC_`.
- **Using the anon client for user creation:** User creation requires `supabase.auth.admin.createUser()` which needs the service_role key. The regular client cannot create users.
- **Skipping cleanup on partial failures:** If auth user creation succeeds but profile creation fails, you have an orphaned auth user that can log in but has no profile/client. Always clean up previous steps on failure.
- **Uploading logos through Server Actions directly:** Next.js Server Actions have a 1MB default request body limit. For logo files, either increase the limit in `next.config.js` or use a signed upload URL pattern where the server generates a Supabase Storage signed URL and the client uploads directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation functions | Zod schemas | Type inference, composable, same schema on client and server |
| User provisioning | Custom signup flow / manual SQL | `supabase.auth.admin.createUser()` | Handles password hashing, email confirmation, JWT claims atomically |
| File upload with size/type validation | Custom multipart parser | Supabase Storage API with bucket restrictions | Built-in MIME type filtering, size limits, and RLS integration |
| Color picker | Custom hex input | HTML `<input type="color">` + hex display | Native browser color picker works well; no library needed |
| Multi-select for campaigns | Custom checkbox list | Headless multi-select component (or simple checkbox list with state) | Accessible keyboard navigation, search filtering |

**Key insight:** The admin Supabase client handles the heavy lifting -- user creation, storage upload, RLS-bypassing queries. Server Actions are the glue that coordinates these operations with validation and error handling. Avoid adding complexity beyond what these tools provide.

## Common Pitfalls

### Pitfall 1: Server Action Body Size Limit for File Uploads
**What goes wrong:** Logo uploads fail silently or throw a cryptic error because Next.js Server Actions default to a 1MB request body limit.
**Why it happens:** FormData with an image file easily exceeds 1MB. Next.js enforces this limit by default.
**How to avoid:** Either configure `serverActions.bodySizeLimit` in `next.config.js` (e.g., `'3mb'`) or use a two-step upload: Server Action returns a Supabase signed upload URL, client uploads directly to Storage.
**Warning signs:** "Request body too large" errors, uploads failing for larger logos but working for tiny ones.

```javascript
// next.config.js -- increase Server Action body size limit
module.exports = {
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
}
```

### Pitfall 2: Orphaned Auth Users on Partial Client Creation Failure
**What goes wrong:** Auth user exists but has no profile or client record. User can log in but the app breaks because no client data exists.
**Why it happens:** Client creation is multi-step (client record, auth user, profile, logo, campaigns). If any step after auth user creation fails without cleanup, the user is orphaned.
**How to avoid:** Implement cleanup in reverse order on failure. If profile creation fails, delete the auth user and client record. Use try/catch blocks around each step.
**Warning signs:** Users that can log in but see empty dashboards or errors.

### Pitfall 3: Stale JWT After Profile/Client Update
**What goes wrong:** After editing a client's settings via the admin API, the client's JWT still contains the old claims until their token refreshes (up to 1 hour by default).
**Why it happens:** The Custom Access Token Hook runs on token issuance, not on profile changes. Existing tokens retain old values.
**How to avoid:** For critical changes (like client_id), this is a non-issue because client_id never changes. For display_name changes, they will reflect on next login. This is acceptable behavior -- no action needed.
**Warning signs:** None for Phase 2 -- this becomes relevant only if you need real-time profile updates.

### Pitfall 4: Missing `username` Field in Requirements
**What goes wrong:** OADM-01 mentions "username" but there is no `username` column in the `clients` or `profiles` table.
**Why it happens:** The requirement says "company name, username, email, password" -- but in practice, the email serves as the username for Supabase Auth. There is no separate username concept.
**How to avoid:** Treat "username" in the requirements as a synonym for the `display_name` field or ignore it as the email address serves that purpose. Do not add a separate `username` column unless the client needs a display name different from the company name.
**Warning signs:** Confusion during form design about what "username" means.

### Pitfall 5: Instantly.ai API Key Scope Requirements
**What goes wrong:** API calls to list campaigns return 401 or 403 errors.
**Why it happens:** Instantly.ai v2 API keys have scopes. If the API key was created without campaign read permissions, the list campaigns endpoint will reject requests. Also, the v2 API requires the Growth plan or above.
**How to avoid:** When creating the Instantly.ai API key, ensure it has the `campaigns:read` scope (or equivalent). Verify the workspace is on the Growth plan or above. Store the key as `INSTANTLY_API_KEY` in `.env.local`.
**Warning signs:** 401/403 errors from the Instantly API, especially if other endpoints work fine.

### Pitfall 6: Public vs Private Storage Bucket Decision
**What goes wrong:** Logos stored in a private bucket require signed URLs for every page load, adding latency and complexity. Logos in a public bucket are accessible to anyone with the URL.
**Why it happens:** Logos are "semi-public" -- they need to be visible in the client's dashboard but should not be guessable/browseable by outsiders.
**How to avoid:** Use a **public bucket** for logos. The URLs contain UUIDs as folder names (e.g., `/client-logos/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/logo.png`), which are not guessable. Logos are not sensitive data. The tradeoff (simplicity + performance vs. theoretical URL-guessing risk) favors public for this use case.
**Warning signs:** Complex signed URL logic for serving simple logos.

## Code Examples

### Database Migration: client_campaigns + Storage Bucket
```sql
-- supabase/migrations/20260216000001_client_campaigns_and_storage.sql

-- =============================================================================
-- CLIENT CAMPAIGNS JUNCTION TABLE
-- =============================================================================

CREATE TABLE public.client_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, campaign_id)
);

ALTER TABLE public.client_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_campaigns_client_id ON public.client_campaigns(client_id);

-- Operators can manage all campaign associations
CREATE POLICY "Operators can manage campaign associations" ON public.client_campaigns
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can view their own campaign associations
CREATE POLICY "Clients can view own campaigns" ON public.client_campaigns
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- =============================================================================
-- STORAGE BUCKET FOR CLIENT LOGOS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  TRUE,                                          -- Public bucket (logos are not sensitive)
  2097152,                                       -- 2MB file size limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Even for public buckets, upload/delete requires auth
-- Only operators can upload/delete logos
CREATE POLICY "Operators can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

CREATE POLICY "Operators can update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

CREATE POLICY "Operators can delete logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Anyone authenticated can read logos (clients need to see their own logo)
CREATE POLICY "Authenticated users can read logos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-logos');

-- =============================================================================
-- ADD username COLUMN TO profiles (for display purposes)
-- =============================================================================

-- The requirement mentions "username" -- we store it in profiles.display_name
-- which already exists. No schema change needed.

-- =============================================================================
-- OPERATORS NEED INSERT/UPDATE ON profiles (for client user provisioning)
-- =============================================================================

CREATE POLICY "Operators can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Operators can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');
```

### Edit Client Server Action
```typescript
// src/app/(operator)/admin/clients/actions.ts (edit action)
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { clientEditSchema } from '@/lib/validations/client'
import { uploadClientLogo } from '@/lib/supabase/storage'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateClient(
  clientId: string,
  prevState: { error: string },
  formData: FormData
) {
  const supabase = createAdminClient()

  // 1. Validate input
  const raw = Object.fromEntries(formData.entries())
  const parsed = clientEditSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // 2. Update client record
  const { error: clientError } = await supabase
    .from('clients')
    .update({
      company_name: parsed.data.companyName,
      primary_color: parsed.data.primaryColor,
      is_recruitment: parsed.data.isRecruitment,
      meeting_url: parsed.data.meetingUrl || null,
    })
    .eq('id', clientId)

  if (clientError) return { error: `Bijwerken mislukt: ${clientError.message}` }

  // 3. Update password if provided
  if (parsed.data.password) {
    // Find the auth user for this client
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('client_id', clientId)
      .eq('user_role', 'client')
      .single()

    if (profile) {
      const { error: authError } = await supabase.auth.admin.updateUserById(
        profile.id,
        { password: parsed.data.password }
      )
      if (authError) return { error: `Wachtwoord bijwerken mislukt: ${authError.message}` }
    }
  }

  // 4. Handle logo upload if new file provided
  const logoFile = formData.get('logo') as File | null
  if (logoFile && logoFile.size > 0) {
    const result = await uploadClientLogo(clientId, logoFile)
    if ('error' in result) return { error: result.error }

    await supabase
      .from('clients')
      .update({ logo_url: result.url })
      .eq('id', clientId)
  }

  // 5. Update campaign associations
  const campaignIds = formData.getAll('campaign_ids') as string[]
  const campaignNames = formData.getAll('campaign_names') as string[]

  // Delete existing associations and re-insert
  await supabase.from('client_campaigns').delete().eq('client_id', clientId)

  if (campaignIds.length > 0) {
    const associations = campaignIds.map((campaignId, i) => ({
      client_id: clientId,
      campaign_id: campaignId,
      campaign_name: campaignNames[i] || 'Unknown Campaign',
    }))

    const { error: campaignError } = await supabase
      .from('client_campaigns')
      .insert(associations)

    if (campaignError) return { error: `Campagnes bijwerken mislukt: ${campaignError.message}` }
  }

  revalidatePath('/admin')
  redirect('/admin')
}
```

### Client Form Component (Shared Create/Edit)
```typescript
// src/components/admin/client-form.tsx
'use client'

import { useActionState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clientFormSchema, type ClientFormValues } from '@/lib/validations/client'

interface ClientFormProps {
  action: (prevState: { error: string }, formData: FormData) => Promise<{ error: string }>
  defaultValues?: Partial<ClientFormValues>
  campaigns: { id: string; name: string }[]
  selectedCampaignIds?: string[]
  isEditing?: boolean
}

export function ClientForm({
  action,
  defaultValues,
  campaigns,
  selectedCampaignIds = [],
  isEditing = false,
}: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: '' })

  const {
    register,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      primaryColor: '#3B82F6',
      isRecruitment: false,
      ...defaultValues,
    },
  })

  return (
    <form action={formAction} className="space-y-6">
      {/* Company Name */}
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Bedrijfsnaam
        </label>
        <input
          {...register('companyName')}
          id="companyName"
          name="companyName"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
        {errors.companyName && (
          <p className="mt-1 text-sm text-red-600">{errors.companyName.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          E-mailadres
        </label>
        <input
          {...register('email')}
          id="email"
          name="email"
          type="email"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Wachtwoord{isEditing && ' (laat leeg om niet te wijzigen)'}
        </label>
        <input
          {...register('password')}
          id="password"
          name="password"
          type="password"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {/* Primary Color */}
      <div>
        <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
          Primaire kleur
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            {...register('primaryColor')}
            id="primaryColor"
            name="primaryColor"
            type="color"
            className="h-10 w-14 cursor-pointer rounded border border-gray-300"
          />
          <input
            {...register('primaryColor')}
            type="text"
            placeholder="#3B82F6"
            className="block w-32 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </div>
      </div>

      {/* Logo Upload */}
      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-gray-700">
          Logo
        </label>
        <input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {/* Recruitment Toggle */}
      <div className="flex items-center gap-2">
        <input
          {...register('isRecruitment')}
          id="isRecruitment"
          name="isRecruitment"
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300"
        />
        <label htmlFor="isRecruitment" className="text-sm font-medium text-gray-700">
          Recruitment klant
        </label>
      </div>

      {/* Meeting URL */}
      <div>
        <label htmlFor="meetingUrl" className="block text-sm font-medium text-gray-700">
          Afspraken URL
        </label>
        <input
          {...register('meetingUrl')}
          id="meetingUrl"
          name="meetingUrl"
          type="url"
          placeholder="https://calendly.com/..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      {/* Campaign Selector */}
      <fieldset>
        <legend className="block text-sm font-medium text-gray-700">Campagnes</legend>
        <div className="mt-2 max-h-60 space-y-2 overflow-y-auto rounded-md border border-gray-300 p-3">
          {campaigns.map((campaign) => (
            <label key={campaign.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                name="campaign_ids"
                value={campaign.id}
                defaultChecked={selectedCampaignIds.includes(campaign.id)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <input type="hidden" name="campaign_names" value={campaign.name} />
              <span className="text-sm text-gray-700">{campaign.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Error Display */}
      {state?.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {pending
          ? (isEditing ? 'Bijwerken...' : 'Aanmaken...')
          : (isEditing ? 'Klant bijwerken' : 'Klant aanmaken')
        }
      </button>
    </form>
  )
}
```

### Instantly.ai Types
```typescript
// src/lib/instantly/types.ts
export interface InstantlyCampaign {
  id: string
  name: string
  status: number
  // Additional fields from API (we only need id and name for Phase 2)
}

export interface InstantlyListResponse<T> {
  items: T[]
  next_starting_after?: string
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (Next.js 14) | `useActionState` (React 19 / Next.js 15) | 2024 | Renamed API; `useFormState` is deprecated. Use `useActionState` from `react`. |
| Instantly API v1 (query param auth) | Instantly API v2 (Bearer token auth) | 2024-2025 | v2 has scoped API keys, better security. v1 docs available but deprecated. |
| Supabase Storage SQL bucket creation | `config.toml` bucket definition + `supabase seed buckets` | 2025 | Both approaches work. SQL INSERT into `storage.buckets` is simpler for migrations. |

**Deprecated/outdated:**
- `useFormState` from `react-dom`: Use `useActionState` from `react` instead.
- Instantly API v1: Use v2 with Bearer token authentication.
- `@supabase/auth-helpers-nextjs`: Already deprecated in Phase 1. Continue using `@supabase/ssr`.

## Open Questions

1. **Instantly.ai API response schema for list campaigns**
   - What we know: The endpoint is `GET https://api.instantly.ai/api/v2/campaigns` with Bearer token auth. Query params include `search`, `status`, `limit`, `starting_after`.
   - What's unclear: The exact response body schema (field names for campaign ID, name, status). The WebFetch of the API docs returned CSS instead of content (JS-rendered docs).
   - Recommendation: During implementation, make a test API call to inspect the actual response structure. The Instantly API explorer at `https://developer.instantly.ai/api/v2/campaign/listcampaign` has a "Try it" feature. Store the API key as `INSTANTLY_API_KEY` env var and test manually before building the UI.

2. **Campaign names: cache or live-fetch?**
   - What we know: We store `campaign_name` in the junction table to avoid API calls for display.
   - What's unclear: Whether campaign names change frequently in Instantly.ai.
   - Recommendation: Cache the name at association time. If campaigns are renamed in Instantly, the old name persists in our DB. This is acceptable -- operators can re-associate to update names. Do NOT live-fetch campaign names on every page load.

3. **Multiple auth users per client**
   - What we know: Current schema supports one auth user per client (one profile with a given client_id). OADM-01 mentions "username, email, password" suggesting one login per client.
   - What's unclear: Whether a client could need multiple user accounts in the future.
   - Recommendation: Build for one user per client for v1. The schema already supports multiple profiles per client_id, so this is extensible without migration.

## Sources

### Primary (HIGH confidence)
- [Supabase Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) - User provisioning API
- [Supabase Storage Access Control](https://supabase.com/docs/guides/storage/security/access-control) - RLS policies for storage.objects
- [Supabase Storage Buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) - Bucket creation and configuration
- [Supabase Storage Creating Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets) - SQL and JS bucket creation
- [Supabase Storage Helper Functions](https://supabase.com/docs/guides/storage/schema/helper-functions) - storage.foldername(), storage.filename(), storage.extension()
- [Supabase createSignedUploadUrl](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl) - Signed URL upload pattern

### Secondary (MEDIUM confidence)
- [Instantly.ai API v2 Campaign Endpoints](https://developer.instantly.ai/api/v2/campaign) - Campaign listing and management
- [Instantly.ai API v2 List Campaign](https://developer.instantly.ai/api/v2/campaign/listcampaign) - List campaigns endpoint
- [Instantly.ai API v2 Authentication](https://developer.instantly.ai/api/v2/apikey) - Bearer token auth, scoped API keys
- [Next.js Forms Guide](https://nextjs.org/docs/app/guides/forms) - useActionState with Server Actions

### Tertiary (LOW confidence)
- Instantly.ai API response schema: Could not extract from JS-rendered docs. Needs manual API testing during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm, existing project uses same versions
- Architecture (client CRUD): HIGH - Supabase admin API is well-documented, Pattern established in Phase 1
- Architecture (Storage): HIGH - Supabase Storage docs are clear on bucket creation, RLS, and upload patterns
- Architecture (Instantly API): MEDIUM - Endpoint URLs and auth method verified, but exact response schema not confirmed
- Pitfalls: HIGH - Based on official docs, known Next.js limitations, and logical analysis of multi-step operations
- Form handling: HIGH - React Hook Form + Zod + useActionState is the established Next.js 15 pattern

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- stable ecosystem, no breaking changes expected)
