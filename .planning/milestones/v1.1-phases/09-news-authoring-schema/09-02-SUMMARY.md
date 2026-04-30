---
phase: 09-news-authoring-schema
plan: 02
subsystem: validation-and-i18n
tags: [zod, supabase-storage, i18n, react, multilingual, news]

# Dependency graph
requires:
  - phase: 02-operator-admin-core
    provides: src/lib/supabase/storage.ts pattern (uploadClientLogo + uploadCampaignVariantsPdf — admin client + bucket + MIME whitelist + getPublicUrl)
  - phase: 04-or-prior
    provides: src/lib/i18n/translations/{nl,en,hi}.ts and the Translations interface used as compile-time shape enforcement across all 3 dictionary files
provides:
  - newsDraftSchema (Zod) accepting all 6 multilingual fields with TITLE_MAX/BODY_MAX caps and optional image_path
  - newsPublishSchema (Zod refine on draftSchema) — server-side authoritative gate that rejects publish unless all 6 language fields trim to non-empty
  - NewsDraftValues + NewsPublishValues type inferences for use in server actions and form components
  - uploadNewsImage(newsItemId, file) — admin-client upload to news-images bucket, raster MIME whitelist (no SVG), 2 MB cap, Date.now() cache-bust suffix, returns { url, path }
  - deleteNewsImage(newsItemId) — list + bulk-remove of newsItemId folder
  - operator.nav.news + operator.news.* i18n namespace with 35 keys per language (nl/en/hi devanagari)
affects: [09-03-server-actions, 09-04-components, 09-05-pages, phase-10-news-delivery, phase-10-archive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TITLE_MAX/BODY_MAX as named constants — single source of truth, no inline magic numbers (extends z.string().max() pattern from clientFormSchema with named caps for tunability)"
    - "newsPublishSchema = newsDraftSchema.refine(...) — refine-on-extend composition; refine path: ['_publishGate'] surfaces a single global error in server-action state.error (D-22)"
    - "uploadNewsImage return shape { url, path } | { error } — extends uploadClientLogo's { url } | { error } with explicit bucket-relative path, so server actions persist news_items.image_path without re-deriving from the public URL"
    - "Time-based filename suffix (Date.now()) for cache-bust on image replacement — matches uploadCampaignVariantsPdf's existing pattern (mailvarianten-${Date.now()}.pdf)"
    - "Path-traversal-impossible filename construction: ${UUID}/image-${number}.${whitelisted-ext} — no user-controlled segment can contain '/' or '..' (T-09-11)"
    - "Translations interface in nl.ts as the compile-time source of truth — adding a key to the interface in nl.ts forces en.ts and hi.ts to provide it (or tsc fails)"
    - "operator namespace as a new top-level Translations key — partitions admin-side strings from client-facing namespaces (nav, common, campaign, etc.)"

key-files:
  created:
    - src/lib/validations/news.ts
  modified:
    - src/lib/supabase/storage.ts
    - src/lib/i18n/translations/nl.ts
    - src/lib/i18n/translations/en.ts
    - src/lib/i18n/translations/hi.ts

key-decisions:
  - "TITLE_MAX = 200, BODY_MAX = 10_000 declared as module-private constants in news.ts — only place these numbers appear in the file is in the const declarations themselves, satisfying the magic-number negation gate"
  - "newsPublishSchema refine error path is ['_publishGate'] — reserved-name slot in the form-error map that downstream server actions can surface as a single global validation message"
  - "uploadNewsImage returns { url, path } (not just { url }) so server-action callers persist image_path directly without parsing the URL — extends rather than mirrors the uploadClientLogo contract"
  - "ALLOWED_NEWS_TYPES is a `as const` tuple — the type-narrow includes() works because TypeScript narrows the literal-type check; SVG is explicitly excluded (T-09-12)"
  - "operator.news.publishGate i18n string is the human-readable rendering of the same rule that newsPublishSchema enforces — server is source of truth, UI shows the message"
  - "operator namespace added as a NEW top-level Translations key — no existing namespace touched (purely additive across all 3 files)"

patterns-established:
  - "Multilingual content validation: per-language field reuse via shared titleField/bodyField constants — when v1.x adds a 4th language, only the object shape needs to change; the per-language type is one declaration"
  - "Refine-on-extend Zod composition: define base schema (draftSchema) for permissive states, then refine into stricter schema (publishSchema) for state-transition gates — preferable to a second discrete schema that duplicates field definitions"
  - "Storage helper return shape extension: when adding to storage.ts, include any caller-needed metadata (path, content_type, expiry) directly in the return object so callers do not re-derive from the URL — simpler and more testable than URL parsing"

requirements-completed: [NEWS-01, NEWS-02, NEWS-03, NEWS-05, NEWS-06]

# Metrics
duration: 4m28s
completed: 2026-04-29
---

# Phase 9 Plan 2: Zod Schemas + uploadNewsImage + i18n Keys Summary

**Validation contract (newsDraftSchema permissive, newsPublishSchema all-3-langs gate via refine), Supabase-Storage helper for raster-only news images with cache-bust filename, and full operator.news.* + operator.nav.news i18n namespace across nl/en/hi (devanagari) — the three Wave-1 contracts that 09-03/04/05 will consume without further negotiation.**

## Performance

- **Duration:** 4m28s
- **Started:** 2026-04-29T20:32:57Z
- **Completed:** 2026-04-29T20:37:25Z
- **Tasks:** 3 (all auto-mode, no checkpoints)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- **newsDraftSchema** — Zod object with `title_nl|en|hi` (max 200) and `body_nl|en|hi` (max 10_000) as 6 separate string fields, plus `image_path` as `optional().or(literal(''))` (matches `clientFormSchema.meetingUrl` empty-string convention). `TITLE_MAX`/`BODY_MAX` as named constants; no inline magic numbers (deterministic gate).
- **newsPublishSchema** — `newsDraftSchema.refine(...)` rejecting whenever ANY of the 6 fields trims to length 0. Refine message in Dutch (project source language), `path: ['_publishGate']` so server actions surface a single-global error in `state.error` per D-22.
- **NewsDraftValues / NewsPublishValues** — `z.infer<>` type aliases exported for downstream form/server-action typing.
- **uploadNewsImage(newsItemId, file)** — `news-images` bucket, 2 MB cap, MIME whitelist `{png, jpeg, webp}` (no SVG, T-09-12), `${UUID}/image-${Date.now()}.${ext}` path (cache-bust + path-traversal-impossible per T-09-11). Returns `{ url, path } | { error }` — extends the analog with the bucket-relative path so callers persist `news_items.image_path` directly.
- **deleteNewsImage(newsItemId)** — list + bulk-remove of the per-item folder, mirrors `deleteClientLogo`.
- **operator namespace in i18n** — new top-level `Translations` key with sub-namespaces `nav` (single key `news`) and `news` (35 keys: page chrome, list view, status badges, form labels, submit buttons, validation messages, preview modal). Identical shape across nl.ts, en.ts, hi.ts (devanagari) — TypeScript-enforced via the `Translations` interface declared in nl.ts.
- **No pre-existing namespace touched** — `nav`, `common`, `campaign`, `flow`, `chat`, `campaignSubPages`, `onboarding`, etc. all unchanged. Pure addition before each file's closing brace.

## Task Commits

1. **Task 1: Create src/lib/validations/news.ts with newsDraftSchema and newsPublishSchema** — `1b2baba` (feat)
2. **Task 2: Add uploadNewsImage to src/lib/supabase/storage.ts** — `a6d42db` (feat)
3. **Task 3: Add operator.news.* + operator.nav.news translation keys to nl/en/hi** — `6f70694` (feat)

**Plan metadata:** `3ade564` (docs: complete Zod + uploadNewsImage + i18n plan — SUMMARY + STATE + ROADMAP)

## Files Created/Modified

- `src/lib/validations/news.ts` (created) — `newsDraftSchema`, `newsPublishSchema`, `NewsDraftValues`, `NewsPublishValues`. 35 lines including imports, named caps, shared titleField/bodyField, refine() gate, and type inferences.
- `src/lib/supabase/storage.ts` (modified) — appended `uploadNewsImage` + `deleteNewsImage` + supporting `NEWS_BUCKET` / `MAX_NEWS_IMAGE_SIZE` / `ALLOWED_NEWS_TYPES` (as const tuple) / `getNewsExtension`. Pure addition after `deleteCampaignVariantsPdf`; existing helpers untouched (verified via `git diff` showing only `+` lines after line 113).
- `src/lib/i18n/translations/nl.ts` (modified) — added `operator: { nav: { news: string }; news: { ... } }` to the `Translations` interface AND the matching `operator: { ... }` literal to the `nl` constant. Both blocks at the end of their respective declarations.
- `src/lib/i18n/translations/en.ts` (modified) — added the matching `operator: { ... }` literal with English values to the `en` constant.
- `src/lib/i18n/translations/hi.ts` (modified) — added the matching `operator: { ... }` literal with Hindi (devanagari) values to the `hi` constant. No transliteration to Latin; `समाचार` (news), `मसौदा` (draft), `प्रकाशित` (published), `वापस लिया गया` (withdrawn), `पूर्वावलोकन` (preview), etc.

## Decisions Made

All decisions in this plan came from CONTEXT.md (D-08, D-11, D-12, D-19, D-21, D-22, D-23, D-24) — no new in-execution decisions were required. The implementation matches the action body in 09-02-PLAN.md verbatim:
- Zod schema shape from D-21 (draft accepts empties, publish refines all-6-non-empty)
- Refine error contract from D-22 (`{ error: string }` returned from server actions)
- Bucket name + size + MIME whitelist from D-11/D-12 (news-images, 2 MB, png/jpeg/webp; no SVG diverges from client-logos by design)
- News content NOT in i18n files from D-24 (only chrome strings)
- Operator nav addition from D-19 (operator.nav.news lives alongside operator.news.* in the same namespace)
- TITLE_MAX/BODY_MAX named constants per the planner's checker fix (deterministic acceptance criteria via grep + magic-number negation)

## Deviations from Plan

### Out-of-spec acceptance-gate text (1 deviation, no code impact)

**1. [Rule 3 - Blocking-but-deterministic-only] Acceptance criterion `grep -c "operator: {" src/lib/i18n/translations/nl.ts returns 1` is structurally unsatisfiable**
- **Found during:** Task 3 verification
- **Issue:** The plan's acceptance criteria for Task 3 says `grep -c "operator: {" nl.ts` returns `1`. But `nl.ts` contains BOTH the `Translations` interface (where `operator: {` is the type-shape declaration) AND the `nl` constant (where `operator: {` is the value-literal start). The literal grep returns `2` for nl.ts (1 in interface + 1 in const), and `1` for en.ts and hi.ts (which import the `Translations` type from nl.ts and only declare the value-literal). The grep gate's `1`-for-nl.ts expectation is incompatible with the file structure the plan itself prescribes.
- **Fix:** Documented the structural reality. The intent of the gate ("each file has the namespace") is satisfied: nl.ts has both the type declaration AND the value, en.ts has the value (it imports the type), hi.ts has the value (it imports the type). No code change — the file is correct; the gate's literal pass criterion was wrong.
- **Files modified:** None (documentation only)
- **Verification:** Master gate `npx tsc --noEmit` passes — this is the AC's own "strongest check, since `Translations` interface enforces shape across all 3 files". TypeScript would have rejected en.ts and hi.ts immediately if the `operator` namespace was missing or misshapen.
- **Committed in:** N/A — the verification deviation is logged here, not in code.

### TDD frontmatter mismatch (1 deviation, no code impact)

**2. [Rule 4-adjacent — proceeded without escalating because it does not affect correctness] Tasks 1 and 2 declared `tdd="true"` but the project has no test framework**
- **Found during:** Task 1 startup
- **Issue:** 09-02-PLAN.md sets `tdd="true"` on Tasks 1 and 2, but the project's `package.json` has no test runner installed (no jest, vitest, mocha, node:test setup). The analog files (`src/lib/validations/client.ts` and `src/lib/supabase/storage.ts`) have NO accompanying tests in the codebase. The plan's own `<verify>` blocks specify `npx tsc --noEmit` (compile-only) and the `<output>` lists only the 5 source files — no test files. Adding a test framework to this project is an architectural change.
- **Fix:** Followed the plan's stated `<verify>` and `<acceptance_criteria>` (TypeScript compile + grep gates). Did NOT install a test framework (would have been a Rule 4 architectural decision the user has not requested for this plan; the rest of the v1.0 codebase is TypeScript-validated only). Did NOT raise this as a checkpoint because the verification path is already deterministic via tsc + greps and the `tdd="true"` flag is recognizable as a planner-template artifact rather than a missing piece of work.
- **Files modified:** None (no test files created — none specified by plan output, none would be runnable without a runner)
- **Verification:** All `<acceptance_criteria>` and `<verify>` gates pass.
- **Committed in:** N/A.

---

**Total deviations:** 2 documented (both verification-only — no code impact)
**Impact on plan:** Zero on shipped artifacts. The plan's intended outcome (5 files, TypeScript compiles, grep gates pass) is fully satisfied. The two deviations are calibration notes for the planner's grep template (#1) and the planner's TDD-flag default for projects without test infrastructure (#2).

## Issues Encountered

- Git printed LF→CRLF warnings on every staged source file (Windows line-ending conversion warning, not an error). All commits succeeded.
- No other issues. Master gate `npx tsc --noEmit` passed first time on each task — the `Translations` interface caught no shape mismatch across nl/en/hi (i.e., I got the 35-keys-each spelling right on the first write).

## Threat Model Coverage

All 5 threats from the plan's `<threat_model>` are addressed by the shipped code:

| Threat ID | Mitigation present | Verification |
|-----------|--------------------|--------------|
| T-09-09 (publish with incomplete translations) | `newsPublishSchema.refine()` checks `trim().length > 0` on all 6 lang fields | grep `newsDraftSchema.refine` count = 1; refine body inspected |
| T-09-10 (DoS via giant text payload) | `bodyField = z.string().max(10_000)` | grep `BODY_MAX = 10_000` count = 1; field uses `bodyField` |
| T-09-11 (path traversal in image upload) | `${newsItemId}/image-${Date.now()}.${ext}` — UUID + numeric + whitelisted ext, no user-controlled segment | path-template literal inspected; ext map is closed (3 entries) |
| T-09-12 (MIME spoofing via SVG) | `ALLOWED_NEWS_TYPES = ['image/png','image/jpeg','image/webp'] as const` — SVG explicitly excluded | grep `image/svg` in storage.ts → only the 2 pre-existing matches in `client-logos` ALLOWED_TYPES; 0 in news section |
| T-09-13 (XSS via news body in client overlay) | TRANSFERRED to Phase 10 — documented in plan; Phase 9 ships plain-text storage that React auto-escapes when rendered as a text node | no Phase-9 code path renders body_*; rendering is Phase 10's surface |

No new threat surface introduced beyond the registered set. No flags for the verifier.

## Threat Flags

None. All security-relevant additions are inside the threat-model registered surface (Zod publish-gate, storage MIME/size whitelist + path construction). No new endpoints, no new auth paths, no new schema (DB schema lives in 09-01).

## Known Stubs

None. All shipped code is wired:
- Zod schemas are pure data validators (no stub data flow).
- uploadNewsImage/deleteNewsImage call the real Supabase admin client (no mock; will become live when DB push lands in 09-06).
- All 35 i18n keys per language have real translated strings (no `''` placeholders, no "TODO" / "coming soon" / "placeholder").

## Next Phase Readiness

- **09-03 server actions** can now import `newsDraftSchema` / `newsPublishSchema` / `NewsDraftValues` from `@/lib/validations/news`, call `uploadNewsImage` / `deleteNewsImage` from `@/lib/supabase/storage`, and read `operator.news.*` chrome via `useT()` — all three Wave-1 contracts are landed.
- **09-04 components** can build `news-form.tsx` / `news-card.tsx` / `news-preview-modal.tsx` against the same Zod types and the i18n namespace.
- **09-05 pages** can wire the routes to `useActionState` + the form component without circular dependencies.
- **DB push (09-06)** is still the BLOCKING wave — these helpers reference `news-images` bucket and `news_items.image_path` which only exist in code today, not in the live database. The full integration test happens in 09-06.
- No blockers. No additional manual setup needed for plans 09-03/04/05.

## Self-Check: PASSED

Verified post-write:
- File created: FOUND `src/lib/validations/news.ts` (35 lines, TypeScript compiles)
- File modified: FOUND new lines in `src/lib/supabase/storage.ts` (additions only after line 113, existing exports untouched)
- File modified: FOUND `operator: {` namespace in `src/lib/i18n/translations/nl.ts` (interface + const), `en.ts` (const), `hi.ts` (const)
- Commits exist:
  - FOUND `1b2baba` (`feat(09-02): add news Zod validation schemas`)
  - FOUND `a6d42db` (`feat(09-02): add uploadNewsImage + deleteNewsImage helpers`)
  - FOUND `6f70694` (`feat(09-02): add operator.news + operator.nav.news i18n keys (nl/en/hi)`)
- All grep gates from acceptance_criteria pass (with the documented #1 deviation on the nl.ts `operator: {` count being structurally `2`, not `1`):
  - Task 1: TITLE_MAX|BODY_MAX = 4; magic-number negation = 0 (only on TITLE_MAX/BODY_MAX lines); refine count = 1; lang-field count = 12
  - Task 2: uploadNewsImage = 1; deleteNewsImage = 1; NEWS_BUCKET = 1; MAX_NEWS_IMAGE_SIZE = 1; image/svg in news section = 0; Date.now() in news path = 1
  - Task 3: operator: { = 2/1/1 (nl/en/hi — see deviation #1); publishGate present in all 3 files; news: 'Nieuws' = 1; news: 'News' = 1; समाचार in hi.ts = 2; tsc --noEmit passes (master gate)
- No file deletions in any of the 3 task commits (`git diff --diff-filter=D HEAD~1 HEAD` empty for each)

---
*Phase: 09-news-authoring-schema*
*Completed: 2026-04-29*
