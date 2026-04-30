---
phase: 09-news-authoring-schema
plan: 06
status: complete
completed_at: 2026-04-30
deployed_via: supabase-studio-sql-editor
---

# Plan 09-06 Summary — Schema Push + End-to-End Smoke

## Outcome

Phase 9 News Authoring & Schema is **deployed and smoke-verified** against the live `dashboards-klanten` Supabase project. All operator-side authoring flows work end-to-end against real DB state.

## What was deployed

The migration `supabase/migrations/20260429000002_news_broadcasting.sql` was applied to the live DB. Because the project's local migration history had drift (~20 migrations created post-v1.0 had been applied to the live DB via Studio without `supabase db push`, leaving `supabase_migrations.schema_migrations` out of sync), the Phase 9 migration was applied via **Option B** from the wave-5 handoff: paste-into-Studio SQL Editor, then `supabase migration repair --status applied 20260429000002 --linked` to register it in the migration tracking table.

This sidestepped the pre-existing drift on the other 20 migrations (out of scope for Phase 9 — those will be reconciled separately).

Live DB now contains:

| Object | Count | Verified via |
|--------|------:|-------------|
| `public.news_items` table | 1 | `information_schema.tables` |
| `public.news_dismissals` table | 1 | `information_schema.tables` |
| `storage.buckets.news-images` (public, 2 MB, png/jpeg/webp only) | 1 | `storage.buckets` |
| RLS policies on `news_items` + `news_dismissals` | 5 | `pg_policies` |
| Storage RLS policies on `news-images` | 4 | `pg_policies` |

Migration history repaired:
```
Repaired migration history: [20260429000002] => applied
Finished supabase migration repair.
```

## Smoke test results

The operator browser-flow was exercised against the live DB. All paths exercised:

- ✅ **Step 1–3 (Nav + empty state):** Operator nav has "Nieuws" link; clicking lands on `/admin/news` with empty-state UI; "Nieuw nieuwsbericht" button reaches `/admin/news/new`.
- ✅ **Step 4–5 (Create):** Form with 3 language tabs + image upload. Submitting "Concept opslaan" inserts a `news_items` row with `status='draft'`, all 6 lang fields persisted (filled and empty alike), `image_path` populated after upload, redirect to `/admin/news/[id]/edit` with the row id.
- ✅ **Step 6 (Tab persistence):** Switching between NL / EN / Hindi tabs preserves entered values. Verified via DB query showing all 3 language variants populated on a single row.
- ✅ **Step 7 (SVG rejection):** SVG MIME type was correctly rejected by both the client `accept` attribute and the server-side MIME whitelist — the bucket only accepts `image/png`, `image/jpeg`, `image/webp`.
- ✅ **Step 8 (Publish gate negative path):** Publishing with incomplete translations returns the localized publish-gate error from `newsPublishSchema.refine()`. Server-authoritative — operator cannot bypass via crafted FormData (the action re-reads the row from the DB before validating).
- ✅ **Step 9–11 (Publish positive path):** Filling all 3 languages and clicking Publish transitions the row to `status='published'` with `published_at` stamped. The "Voorvertoning" modal renders the news in any of the 3 languages with the image visible across all three tabs.
- ✅ **Step 12 (Withdraw):** Withdraw transitions a published item to `status='withdrawn'` with `withdrawn_at` stamped. Soft-delete confirmed: row still appears in the operator admin list.
- ✅ **Step 13 (RLS smoke — operator side):** SQL query against `news_items` from the operator role returns rows in all statuses.
- ✅ **Step 14 (Cross-tenant client read):** A client user logged in (after the unrelated `Locale` bugfix below). Phase 9 does not render news on the client side — that is **Phase 10's** job (DELIVER-* + ARCH-* requirements). Verified instead via SQL: a client SELECT returns only `status='published'` rows (no `client_id` filter — global broadcast as designed in D-14).

## Bug surfaced and fixed during smoke

A pre-existing bug surfaced when the dev server re-bundled with the Phase 9 i18n key additions:

**Symptom:** Logging in as a client threw `ReferenceError: Locale is not defined` in `(client)/dashboard/page.js`.

**Root cause:** `src/lib/i18n/actions.ts` had `'use server'` directive AND `export type { Locale }`. Next.js 15 + Turbopack treats every export from a `'use server'` file as a server-action reference and tries to register it via `registerServerReference()`. Types are erased at runtime, so `Locale` resolved to `undefined`, producing the runtime ReferenceError. The bug existed pre-Phase-9 but was masked by Turbopack's incremental compilation cache; Phase 9's i18n additions forced a re-bundle of the actions module and exposed it.

**Fix:** Removed the `import type { Locale }` and `export type { Locale }` lines from `src/lib/i18n/actions.ts`. The only consumer (`language-switcher.tsx`) imports `setLocale`, not the type — clean removal, no breakage. Committed as `040a936`.

**Lesson for the project:** `'use server'` files must export ONLY async functions. Type re-exports from such files break at runtime. This is a Next.js gotcha worth adding to CLAUDE.md or PROJECT.md decisions if more `'use server'` files are added.

## Requirements closed

All NEWS-* requirements are now live-verifiable:

- ✅ NEWS-01 — Operator can create news with image + NL/EN/Hindi
- ✅ NEWS-02 — Operator can edit any field of any language variant
- ✅ NEWS-03 — Operator can publish (gated on all 3 languages filled)
- ✅ NEWS-04 — Operator can withdraw (soft-delete; row remains in admin)
- ✅ NEWS-05 — List view shows status + timestamps
- ✅ NEWS-06 — Preview modal switches between language variants

The 7th deliverable (`news_dismissals` schema groundwork) is also live and ready for Phase 10 to write to.

## Phase 9 closeout

| Plan | Wave | Commits | SUMMARY |
|------|------|---------|---------|
| 09-01 | 1 | `1943223`, `3faa8bc`, `1482c18` | ✓ |
| 09-02 | 1 | `1b2baba`, `a6d42db`, `6f70694`, `3ade564`, `e17bc65` | ✓ |
| 09-03 | 2 | `426b44a`, `5059469` | ✓ |
| 09-04 | 3 | `24e7653`, `d2ac020`, `8cafddd`, `2ac2a0e` | ✓ |
| 09-05 | 4 | `066915a`, `4f2b019`, `bd5f949`, `cddffb8`, `6429ce1` | ✓ |
| 09-06 | 5 | `040a936` (smoke-time bugfix) | this file |

**Phase 9 status: COMPLETE.** Ready for Phase 10 (client-side delivery + archive).
