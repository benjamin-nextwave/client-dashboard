# Phase 9: News Authoring & Schema - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Operator-side news authoring (multilingual: NL/EN/Hindi) and the underlying database + storage schema. Specifically: a CRUD UI under `/admin/news`, two new tables (`news_items`, `news_dismissals`), a Supabase Storage bucket for news images, RLS policies, and server actions for create/edit/publish/withdraw. Does NOT include client-side delivery — that is Phase 10.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**7 requirements are locked.** See `09-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `09-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Migration creating `news_items` table (multilingual columns + status enum + image_path nullable + timestamps + created_by FK)
- Migration creating `news_dismissals` table (schema only — no Phase 9 reads/writes)
- New Supabase Storage bucket for news images, with size + MIME constraints aligned with existing `client-logos`
- Storage helper for news image upload + public URL retrieval, in `src/lib/supabase/storage.ts`
- RLS policies: operator full CRUD on `news_items`; clients SELECT only `status='published'` rows; users INSERT/SELECT own rows in `news_dismissals`
- Operator admin section: list page + create page + edit page + actions.ts (server actions)
- Zod validation with publish-time check that all 6 language fields are non-empty
- Per-language preview UI (NL/EN/Hindi)

**Out of scope (from SPEC.md):**
- Client-side overlay, sidebar, dismissal UI — Phase 10
- INSERT-ing into `news_dismissals` from any UI — Phase 10
- Cross-tenant targeting (`client_id` on news_items) — deferred to v1.2
- Scheduled publish/withdraw — deferred to v1.2
- Rich text formatting (markdown/WYSIWYG) — plain text only
- Multiple images per news item — one optional image
- Auto-translation — operator authors all 3 variants manually
- Read/dismiss analytics
- Email/push notifications

</spec_lock>

<decisions>
## Implementation Decisions

### Authoring UI shape
- **D-01:** Edit form uses three tabs (NL / EN / Hindi) inside a single edit page. Each tab swaps `title` and `body` input fields. The image upload input lives ABOVE the tabs (one shared image across all variants).
- **D-02:** A "publish" / "withdraw" button is rendered on the edit page based on current status. Server-side validation rejects publish if any of the 6 language fields is empty; UI may also disable the button when fields are detected empty client-side, but server is source of truth.
- **D-03:** The form pattern is the project's React 19 standard: `useActionState` + react-hook-form + Zod (matches `src/components/admin/client-form.tsx`).

### Preview placement
- **D-04:** Preview is a "Preview" button on the edit form that opens a full-screen MODAL dialog. Inside the modal, a language switcher (NL / EN / Hindi tabs) lets the operator see the rendering for any variant. The modal is opened explicitly — no live side-panel preview.
- **D-05:** The modal renders the news item exactly as the client overlay will render it (image + title + body), so the operator can sanity-check what clients will see. Phase 10 will reuse this rendering component for the actual client overlay; Phase 9 builds it as a presentation component first.

### List view layout
- **D-06:** Operator news list at `/admin/news` is a CARD GRID. Each card shows the news image thumbnail (or a placeholder when `image_path = NULL`), the NL title (with EN fallback if NL is empty in a draft), a status badge (`Concept` / `Gepubliceerd` / `Ingetrokken`), `created_at`, and `published_at` (or "—"). Card click navigates to the edit page; per-card primary action button (Publish / Withdraw / Re-edit) appears based on status.
- **D-07:** Cards arrange in a responsive grid (e.g., 1 column mobile, 2 columns tablet, 3 columns desktop). Use Tailwind grid utilities consistent with existing admin pages.

### Claude's Discretion (decided based on existing patterns — no separate user discussion needed)

#### Database schema details
- **D-08:** `news_items` columns: `id uuid PK default gen_random_uuid()`, `title_nl varchar(200)`, `title_en varchar(200)`, `title_hi varchar(200)`, `body_nl text`, `body_en text`, `body_hi text` (all default `''` empty string, NOT NULL — drafts can be partial but never NULL), `image_path text NULL`, `status varchar(16) NOT NULL CHECK (status IN ('draft','published','withdrawn')) DEFAULT 'draft'`, `created_at timestamptz NOT NULL DEFAULT NOW()`, `created_by uuid REFERENCES profiles(id)`, `published_at timestamptz NULL`, `withdrawn_at timestamptz NULL`.
- **D-09:** `news_dismissals` columns: `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `news_item_id uuid NOT NULL REFERENCES news_items(id) ON DELETE CASCADE`, `dismissed_at timestamptz NOT NULL DEFAULT NOW()`. Composite PRIMARY KEY `(user_id, news_item_id)` so a duplicate dismissal is a no-op via `INSERT ... ON CONFLICT DO NOTHING`.
- **D-10:** Status uses a CHECK constraint (not a Postgres ENUM type) — matches the project's existing pattern (`profiles.user_role`, `profiles.language`).

#### Storage bucket
- **D-11:** Bucket name: `news-images`. Public bucket (read via `getPublicUrl`, like `client-logos`).
- **D-12:** Size limit: 2MB (matching `client-logos`). MIME whitelist: `image/png`, `image/jpeg`, `image/webp` (no SVG — content images don't typically need vector format and SVG widens the attack surface).
- **D-13:** Bucket creation uses the same migration-driven approach as `client-logos` (created in `20260216000001_client_campaigns_and_storage.sql`). The new migration creates the bucket via `storage.create_bucket()` or equivalent SQL, plus storage RLS policies.

#### RLS policies
- **D-14:** `news_items`:
  - Operators: `(SELECT auth.jwt() ->> 'user_role') = 'operator'` for ALL operations (SELECT, INSERT, UPDATE, DELETE)
  - Clients: `(SELECT auth.jwt() ->> 'user_role') = 'client' AND status = 'published'` for SELECT only — no client_id check (news is global)
- **D-15:** `news_dismissals`:
  - Users (any authenticated user) can SELECT/INSERT WHERE `user_id = auth.uid()`
  - Operators can SELECT all rows (useful for support/debugging — no UI surfaces this in Phase 9)
- **D-16:** Storage policies on `news-images` bucket: operators can INSERT/UPDATE/DELETE; everyone authenticated can SELECT (read public URLs).

#### Server actions structure
- **D-17:** All server actions live in `src/app/(operator)/admin/news/actions.ts`. Exports:
  - `createNewsItem(prevState, formData)` — inserts a row with `status='draft'`
  - `updateNewsItem(id, prevState, formData)` — updates fields by id
  - `publishNewsItem(id)` — server-side validates all 6 lang fields non-empty, then sets `status='published'` + `published_at=NOW()`
  - `withdrawNewsItem(id)` — sets `status='withdrawn'` + `withdrawn_at=NOW()`
  - `uploadNewsImage(file)` — uploads to `news-images` bucket via storage helper, returns `image_path`
- **D-18:** Use `supabase.auth.admin` client (service-role) for INSERT/UPDATE/DELETE on `news_items` — matches the project's pattern of admin-side writes bypassing RLS for operator actions, while RLS still gates client reads. (See `clients/actions.ts` for reference.)

#### Operator nav integration
- **D-19:** Add a `Nieuws` link in `src/app/(operator)/_components/operator-header.tsx` between `/admin` and `/admin/errors` (or an order that makes sense). The label is provided via `useT()` and added to `src/lib/i18n/translations/{nl,en,hi}.ts` as e.g. `operator.nav.news`.

#### Routes
- **D-20:** Phase 9 creates these routes:
  - `src/app/(operator)/admin/news/page.tsx` — card grid list view
  - `src/app/(operator)/admin/news/new/page.tsx` — create form
  - `src/app/(operator)/admin/news/[id]/edit/page.tsx` — edit form (reuses the same form component)
  - `src/app/(operator)/admin/news/actions.ts` — server actions
  - `src/components/admin/news-form.tsx` — shared form component
  - `src/components/admin/news-preview-modal.tsx` — preview modal (reused in Phase 10)
  - `src/components/admin/news-card.tsx` — list card

#### Validation
- **D-21:** Zod schema in `src/lib/validations/news.ts`:
  - `newsDraftSchema` — for create/update: all 6 language fields are strings (allowed empty), title_* max 200 chars, body_* max 10_000 chars, image_path optional
  - `newsPublishSchema` — `newsDraftSchema.refine()` that requires all 6 language fields non-empty
- **D-22:** Server action calls `safeParse` on the appropriate schema; returns `{ error: string }` on failure (matches existing pattern).

#### i18n strings
- **D-23:** Add operator-UI strings (page titles, button labels, status badges, validation messages) to `src/lib/i18n/translations/{nl,en,hi}.ts` under a new `operator.news` namespace. Examples: `operator.news.title`, `operator.news.create`, `operator.news.publishGate` (the validation message), `operator.news.status.draft`, etc.
- **D-24:** News content fields (title_*, body_*) are stored on the row, NOT in the translation files. The translation files only hold UI chrome strings.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract (locked)
- `.planning/phases/09-news-authoring-schema/09-SPEC.md` — Locked requirements, boundaries, acceptance criteria. MUST read before planning.
- `.planning/REQUIREMENTS.md` §v1.1 — REQ-IDs NEWS-01..06 with descriptions.
- `.planning/ROADMAP.md` §"Phase 9: News Authoring & Schema" — Phase goal, success criteria, dependency on Phases 1 & 2.

### Project-level context
- `.planning/PROJECT.md` §"Constraints" — Tech stack, tenant model, RLS strategy.
- `.planning/PROJECT.md` §"Key Decisions" — Existing decisions on RLS subselects, useActionState, admin-client for service operations, JWT custom claims hook.

### Codebase patterns to reuse (read these before writing similar code)
- `src/app/(operator)/admin/clients/page.tsx` — Operator list-view pattern (the news list uses cards instead, but the route structure mirrors).
- `src/app/(operator)/admin/clients/[clientId]/edit/page.tsx` — Edit page route shape.
- `src/app/(operator)/admin/clients/actions.ts` — Server actions shape (`createClient`, `updateClient` with `useActionState` integration). News actions follow the same pattern.
- `src/components/admin/client-form.tsx` — Form pattern: `useActionState` + react-hook-form + Zod, error rendering, submit button with `pending` state.
- `src/lib/validations/client.ts` — Zod schema location convention.
- `src/lib/supabase/storage.ts` — Storage helper pattern (`uploadClientLogo`, `uploadCampaignVariantsPdf`). Add `uploadNewsImage` and any retrieval helper here.
- `src/app/(operator)/_components/operator-header.tsx` — Nav location to add the "Nieuws" link.
- `src/lib/i18n/translations/nl.ts` (and `en.ts`, `hi.ts`) — Where to add `operator.news.*` keys.
- `src/lib/i18n/client.ts` — `useT()` hook usage.

### Migrations to mirror
- `supabase/migrations/20260215000001_initial_schema.sql` — Initial table + RLS pattern (`auth.jwt() ->> 'user_role'` and `auth.jwt() ->> 'client_id'` subselect; check constraints; tenant FK pattern). News tables follow this pattern but news_items has NO client_id (global broadcast).
- `supabase/migrations/20260215000002_custom_access_token_hook.sql` — JWT claim injection (`user_role`, `client_id`). RLS policies on news_items rely on `user_role` claim.
- `supabase/migrations/20260216000001_client_campaigns_and_storage.sql` — Storage bucket creation pattern (`client-logos` bucket). News-images bucket follows this template.
- `supabase/migrations/20260429000001_profile_language.sql` — Recent migration adding `profiles.language` enum (`nl`/`en`/`hi`). News content rendering will read this column to decide which language variant to show clients in Phase 10.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`useActionState` form pattern** (`src/components/admin/client-form.tsx`): React 19 server-action form with `pending` state and error display — copy this shape for `news-form.tsx`.
- **Storage helper** (`src/lib/supabase/storage.ts`): existing `uploadClientLogo` is the closest analog; `uploadNewsImage` should mirror it (same MIME constraints, same return shape).
- **`useT()` i18n hook** (`src/lib/i18n/client.ts`): use for all operator-UI strings (page title, buttons, badges, validation messages).
- **`LanguageSwitcher`** component: surfaces user-facing language selection. The preview modal can include a similar (or smaller) tab strip to switch between rendering NL/EN/Hindi previews.
- **Operator admin layout** (`src/app/(operator)/layout.tsx` + `_components/operator-header.tsx`): wraps all `/admin/*` pages — Phase 9 routes inherit this automatically by living under `(operator)/admin/`.

### Established Patterns
- **Admin route structure**: `app/(operator)/admin/<resource>/{page.tsx, [id]/edit/page.tsx, new/page.tsx, actions.ts}` — exact pattern to follow.
- **RLS subselect**: `(SELECT auth.jwt() ->> 'claim')` for performance (project decision per PROJECT.md Key Decisions).
- **Admin client (service-role)**: server actions use the admin client to bypass RLS on writes (consistent across phases per PROJECT.md).
- **Migration timestamping**: Filename pattern `YYYYMMDDHHMMSS_descriptive_name.sql`. The new migration should be timestamped after `20260429000001`.
- **Status as CHECK constraint** (not ENUM type): matches `profiles.user_role` and `profiles.language` patterns. Easier to alter, no type juggling.
- **Public storage bucket + getPublicUrl**: `client-logos` is the analog. News-images should use the same approach.

### Integration Points
- **Operator nav header** (`src/app/(operator)/_components/operator-header.tsx`): add a `Nieuws` link.
- **Storage helper module** (`src/lib/supabase/storage.ts`): add `uploadNewsImage()` export.
- **i18n translation files** (`src/lib/i18n/translations/{nl,en,hi}.ts`): add `operator.news.*` namespace.
- **Database migration directory** (`supabase/migrations/`): one new migration for `news_items` + `news_dismissals` + `news-images` bucket + RLS policies.
- **Phase 10 reuse hook**: the preview-modal rendering component (`news-preview-modal.tsx` content area) will be reused as the client-side overlay rendering surface in Phase 10. Build it as a presentational component that takes `{ image_path, title, body, language }` props.

</code_context>

<specifics>
## Specific Ideas

- "Drie tabs in één form, image gedeeld erboven" — operator's mental model is "one news item with 3 variants", not "3 separate items". Tabs reflect that.
- "Preview modal met taal-switcher" — operator wants to explicitly check, not have noise on screen during typing. The modal becomes the operator's "what does the client see?" viewport — same component will render the actual client overlay in Phase 10.
- "Card grid met thumbnail" — at-a-glance scanning of recent news beats a dense table for this use case (operators don't have hundreds of news items, image is meaningful info).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

The following came up during spec-phase and are documented in REQUIREMENTS.md "Future Requirements" or "Out of Scope":
- Targeting news to specific tenants/clients — TARGET-01 (v1.2)
- Scheduled publish/withdraw — TARGET-02 (v1.2)
- Read/dismiss analytics — ENGAGE-01 (v1.2)
- Call-to-action buttons in news — ENGAGE-02 (v1.2)

</deferred>

---

*Phase: 09-news-authoring-schema*
*Context gathered: 2026-04-29*
