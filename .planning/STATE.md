# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.

**Current focus:** v1.1 News Broadcasting — operator-broadcast multilingual announcements with overlay-on-open + sidebar archive

## Current Position

Phase: 10 — Client News Delivery & Archive
Plan: 0/6 complete
Status: Ready to execute (SPEC + CONTEXT + 6 plans across 4 waves locked, plan-checker passed; animations adjusted to use Tailwind 4 keyframes in globals.css since project doesn't have tailwindcss-animate)
Last activity: 2026-04-30 — Phase 10 plans created and verified (6 plans, 4 waves)

## Milestone v1.0 Outcomes (archived)

**Velocity:**
- Total plans completed: 25
- Average duration: ~3.2 min
- Total execution time: ~81 min
- 38/38 v1 requirements shipped

See `.planning/MILESTONES.md` and `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 history.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**v1.1 roadmap decisions:**
- Two-phase split for News Broadcasting (Phase 9 authoring + schema, Phase 10 delivery + archive) — chosen over one-phase for tighter cohesion and clearer success criteria; each phase delivers an independently verifiable capability
- `news_dismissals` table created in Phase 9 (with `news_items`) so Phase 10 has no schema dependency to wait on

**Phase 9 / Plan 09-01 decisions:**
- Migration timestamp `20260429000002` chosen sequentially after `20260429000001_profile_language.sql` on the same date
- `news-images` Storage bucket excludes `image/svg+xml` (whitelist: png/jpeg/webp only) — deliberate divergence from `client-logos` to reduce XSS surface on operator-authored content (T-09-07)
- Migration is forward-only DDL — DB push deferred to plan 09-06 (BLOCKING wave 5) so all server actions / components / routes in waves 2-4 are written against the migration text before a single push lands the schema
- `news_dismissals` uses composite PK `(user_id, news_item_id)` for natural idempotency on Phase-10 INSERT-ON-CONFLICT writes

**Phase 9 / Plan 09-02 decisions:**
- TITLE_MAX = 200 / BODY_MAX = 10_000 declared as module-private constants in `src/lib/validations/news.ts` — single source of truth, no inline magic numbers (passes the planner's deterministic-grep gate)
- newsPublishSchema = newsDraftSchema.refine(...) with refine path `['_publishGate']` — reserved-name slot for the form-error map; server actions surface a single global error in state.error (D-22)
- uploadNewsImage returns `{ url, path } | { error }` (not just `{ url }`) — extends uploadClientLogo's contract with the bucket-relative path so server actions persist `news_items.image_path` directly without parsing the URL
- ALLOWED_NEWS_TYPES is an `as const` tuple — the type-narrow includes() works because TypeScript narrows the literal-type check; SVG explicitly excluded (T-09-12)
- operator.* namespace added as a NEW top-level Translations key — no existing namespace touched (purely additive across nl/en/hi); Hindi values use devanagari Unicode (no transliteration)
- `Translations` interface in nl.ts is the compile-time source of truth — `tsc --noEmit` verifies en.ts and hi.ts both provide the full operator namespace shape (35 keys + nav.news)

**Phase 9 / Plan 09-03 decisions:**
- publishNewsItem re-reads the news_items row from the DB BEFORE applying newsPublishSchema — the FormData payload is NOT the gate input. Operators cannot bypass the all-3-langs requirement by crafting a FormData with all fields filled for a row whose DB columns are still partial (T-09-15). The two non-gated actions (create + update) read FormData directly because they do not enforce the 6-fields gate.
- updateNewsItem's UPDATE statement explicitly lists exactly the 6 content columns by name (no spread, no whitelist). status/published_at/withdrawn_at/created_at/created_by/image_path are reachable ONLY via the dedicated transition functions (publish/withdraw/delete + the post-upload UPDATE) — makes "this UPDATE cannot touch status" a code-review-able guarantee (T-09-16).
- readRawFromFormData reads ONLY the 6 language fields. The form sends the image as a File under name='image'; image_path is set entirely server-side via the uploadNewsImage flow (T-09-30) — a forged FormData with image_path cannot poison the DB.
- Two-step image upload: insert with image_path=null FIRST, then conditional follow-up UPDATE with the bucket-relative path returned by uploadNewsImage — the row always represents what's persisted, the upload is non-fatal (matches createClient/uploadClientLogo).
- createNewsItem redirects to /admin/news/{id}/edit (NOT /admin/news) so the operator lands on the edit page to keep filling the other languages — pages plan 09-05 must NOT add an extra redirect.
- updateNewsItem returns { error: '' } (does NOT redirect) — the form stays on the edit page for live editing.
- publishNewsItem and withdrawNewsItem are NOT useActionState-shaped — they take a single id and return { error?: string }. 09-04 will call them via `<form action={fn.bind(null, id)}>` or `useTransition`.
- getOperatorProfileId returns null deliberately for Phase 9 — news_items.created_by is nullable (D-08) and operator routes are gated by the (operator) layout. Per-operator audit attribution is a future concern.
- Status-precondition guards (publish requires status='draft', withdraw requires status='published') prevent crafted re-publish or re-withdraw POSTs from producing weird states — UI in 09-04 only renders the right button per status, but these are belt-and-suspenders.

**Phase 9 / Plan 09-04 decisions:**
- NewsContentRenderer is a SEPARATE export from news-preview-modal.tsx (not just an internal component) — Phase 10 imports it directly for the client-side overlay surface without re-implementing the renderer (D-05 reuse contract).
- All 6 RHF inputs in NewsForm are always mounted via `hidden` for inactive tabs — switching tabs MUST NOT remount the inputs (would lose typed-but-not-yet-saved values across switches).
- register() loop with template-literal field names: `register(\`title_${lang}\` as const)` — 2 register() calls × 3 langs = 6 actual registrations; matches the planner's skeleton and keeps field names narrow-typed.
- File input in NewsForm uses literal `name="image"` attribute and is intentionally NOT registered with RHF — files are not part of the form state model; server reads via formData.get('image') (T-09-30 contract).
- NewsCard uses useTransition (not useActionState) for Publish/Withdraw — these are id-keyed RPC calls, not form submissions; useTransition gives the pending flag without needing an inline form.
- Body in NewsContentRenderer is rendered as a React text node `{body}` with whitespace-pre-wrap — preserves operator-entered newlines without parsing as HTML (T-09-19 mitigation; React auto-escapes).
- alert() for error surfacing in NewsCard — toast infrastructure is out of scope for Phase 9; alert is acceptable v1.1 quality bar (3 internal operators, deterministic flow).
- displayTitle = NL preferred → EN fallback → '(zonder titel)' literal — drafts are explicitly allowed to be partial (NEWS-01 acceptance); the literal is a stable Dutch placeholder for the rare empty-empty case.

**Phase 9 / Plan 09-05 decisions:**
- Empty-state UI for the list page lives INSIDE NewsListChrome (a client component using useT()) — not as a hardcoded server-component EmptyState. Keeps all chrome strings in i18n (D-23) and the empty-state consistent with the rest of the chrome (operator.news.listEmpty + operator.news.createButton).
- image_path is NOT in the edit page's NewsForm defaultValues — would have been a TypeScript error against NewsDraftValues (form state owns only the 6 lang fields, T-09-30: image_path is server-managed). Existing image is shown via the form's currentImageUrl prop instead. Plan body listed image_path; that line was dropped as a Rule 3 blocking-issue auto-fix.
- useT() invoked as a function `t('operator.news.<key>')`, not as property access — matches the project's actual Translator type (a string-key function) and 09-04's existing call sites. Same calibration as 09-04 deviation #1.
- Status label in EditNewsHeader (Concept/Gepubliceerd/Ingetrokken) is computed server-side as a stable Dutch literal and passed in as a prop. v1.1 corner-case label (3 internal operators), comparable to (zonder titel) in NewsCard.
- NAV array moved INSIDE OperatorHeader function so the news entry can call t() — existing labels stay hardcoded Dutch (out of scope to refactor in Phase 9). Verified that no external consumer imports the NAV symbol from operator-header.tsx (only the OperatorHeader component itself is imported, by (operator)/layout.tsx).
- News nav entry positioned between Overzicht and Fouten (per D-19). Match predicate uses startsWith('/admin/news') so subroutes (/new, /[id]/edit) light up active state.
- Action panel shows Delete unconditionally with a confirm() prompt as the safety gate. router.refresh() after publish/withdraw success (status badge updates without scroll loss); router.push('/admin/news') after delete success.

### Pending Todos

None.

### Blockers/Concerns

No active blockers.

**Known items carried from v1.0 for future milestones:**
- CSV processing at scale (20k+ rows) relies on client-side PapaParse — monitor for edge cases
- Instantly API rate limits (500ms inter-campaign delay) may need tuning under heavier load
- Custom Access Token Hook requires manual Supabase Dashboard setup per deployment

## Session Continuity

Last session: 2026-04-30 — Phase 10 SPEC + CONTEXT + 6 plans created. Plan-checker passed with 4 non-blocking warnings; 2 animation-related warnings addressed (Tailwind 4 keyframes added to plan 10-04 Task 0 — slideInFromRight; overlay uses existing animate-fadeIn). User delegated all implementation choices ("vertrouw dat jij de beste keuzes kan maken voor gebruikersvriendelijkheid en professionele uitstraling"); 28 decisions documented in CONTEXT.md.
Stopped at: Plans verified, ready for execute-phase.
Next action: `/gsd-execute-phase 10` — waves 1-3 autonomous (i18n + dismissAction + 3 components + dashboard wiring), wave 4 manual smoke verify.

---
*Milestone switched: 2026-04-29 — v1.0 (shipped) → v1.1 News Broadcasting*
*Last updated: 2026-04-30 after Phase 9 closeout (live smoke verified)*
