---
phase: 10-client-news-delivery-archive
plan: 01
subsystem: i18n
tags: [i18n, typescript, translations, devanagari, client-news]

requires:
  - phase: 09-news-authoring-schema
    provides: "operator.news.* namespace pattern (purely additive top-level Translations key, devanagari Hindi convention) — Phase 10 mirrors this for client.news.*"
provides:
  - "client.news.* i18n namespace with 10 keys in nl/en/hi (dismissButton, megaphoneAriaLabel, sidebarTitle, sidebarBackToList, sidebarEmpty, plus 5 relativeTime keys)"
  - "Translations interface in nl.ts extended with the client.news shape — compile-time gate for downstream Wave-2 components"
affects: [10-02, 10-03, 10-04, 10-05, 10-06]

tech-stack:
  added: []
  patterns:
    - "Top-level Translations namespace (client) appended after operator — purely additive, no key reorder"
    - "Devanagari Hindi (no transliteration) for client-facing strings"
    - "{count} interpolation token for relative-time variants (matches overview.rangePeriodLast pattern)"

key-files:
  created: []
  modified:
    - src/lib/i18n/translations/nl.ts
    - src/lib/i18n/translations/en.ts
    - src/lib/i18n/translations/hi.ts

key-decisions:
  - "client.news.* added as a NEW top-level Translations key, mirroring Phase 9's operator.news.* calibration — no existing namespace touched (purely additive across nl/en/hi)"
  - "10 keys total: 6 base UI strings (dismissButton, megaphoneAriaLabel, sidebarTitle, sidebarBackToList, sidebarEmpty, relativeTimeJustNow) + 4 relative-time variants (relativeTimeMinutes/Hours/Days/Weeks) — covers the full sidebar list-item time string surface (D-21)"
  - "Hindi values use devanagari Unicode (no transliteration) — same convention as operator.news.* in Phase 9"
  - "{count} placeholder for relativeTime* keys — matches the project's existing makeTranslator interpolation pattern (e.g. overview.rangePeriodLast: 'Afgelopen {days} dagen')"
  - "Translations interface in nl.ts is the compile-time SOT — `tsc --noEmit` verifies en.ts and hi.ts both satisfy the new shape (D-22, T-10-01 mitigation)"
  - "EN sidebarBackToList chosen as 'Back to overview' rather than 'Back to list' — reads more naturally in EN and pairs with NL 'Terug naar overzicht'; explicitly listed in plan body"

patterns-established:
  - "client.news.* namespace ready for Wave-2 component consumption: NewsOverlay (10-03), NewsMegaphoneButton + NewsSidebar (10-04) call useT() with full autocomplete on the 10 keys"

requirements-completed: [DELIVER-03, ARCH-01, ARCH-02, ARCH-03, ARCH-04]

duration: 2min
completed: 2026-04-30
---

# Phase 10 Plan 01: i18n Strings (client.news.*) Summary

**Added the 10-key `client.news.*` namespace to all three locale files (nl/en/hi) and extended the `Translations` interface in `nl.ts` so downstream Wave-2 client-news components get compile-time autocomplete and TypeScript type-narrowing across locales.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-30T14:19:53Z
- **Completed:** 2026-04-30T14:21:36Z
- **Tasks:** 1 / 1 completed
- **Files modified:** 3

## Accomplishments

- Extended the `Translations` interface in `nl.ts` with a top-level `client: { news: { ... } }` block declaring 10 keys
- Added the 30 string entries (10 keys × 3 locales) — Dutch, English, and Hindi devanagari values
- TypeScript build remains green (`npx tsc --noEmit` passes silently — proves en.ts and hi.ts satisfy the extended shape)
- Operator namespace untouched (`grep -c 'operator: {'` unchanged at 2/1/1 across nl/en/hi)
- Wave 2 components (10-03 NewsOverlay, 10-04 NewsMegaphoneButton/NewsSidebar) can now reference `client.news.*` keys via `useT()` with full IDE autocomplete and type-checked key paths

## Task Commits

1. **Task 1: Add client.news.* namespace to all 3 locale files + extend Translations interface** — `2e807fd` (feat)

**Plan metadata commit:** _to be added after this SUMMARY is written_

## Files Modified

- `src/lib/i18n/translations/nl.ts` — Added `client.news` block to the `Translations` interface (10 string-typed fields) and the corresponding NL string values to the `nl: Translations = {...}` export. Appended after the existing `operator: {...}` block in both the interface and the value.
- `src/lib/i18n/translations/en.ts` — Added the EN `client.news` block to the `en: Translations = {...}` export (10 values), appended after the operator block.
- `src/lib/i18n/translations/hi.ts` — Added the Hindi devanagari `client.news` block to the `hi: Translations = {...}` export (10 values), appended after the operator block.

## Decisions Made

All decisions inherited from `10-CONTEXT.md` D-21/D-22 and the plan body — no new discretionary choices were made during execution.

- The 10 keys exactly match the D-21 list (6 base + 4 relative-time variants).
- `dismissButton` strings: NL `'Ik heb het gelezen'`, EN `'I have read it'`, HI `'मैंने इसे पढ़ लिया है'`.
- `megaphoneAriaLabel` strings: NL `'Open nieuwsoverzicht'`, EN `'Open news overview'`, HI `'समाचार अवलोकन खोलें'`.
- All five `relativeTime*` strings use `{count}` interpolation (zero variants such as 'now/just now' are hard-coded in `relativeTimeJustNow`).

## Deviations from Plan

None — plan executed exactly as written.

The plan's `<read_first>` notes turned out to be off by one line (the `Translations` interface closes at line 523, not 522, and the `nl: Translations` value at line 1095 not 1094 — the file is 1 line longer than the planner's estimate). This had no functional impact: the Edit tool used unique string anchors (the exact closing-brace + assignment pattern) rather than line numbers, so the operations were precise. Not tracked as a deviation since no rule was applied.

## Issues Encountered

None.

## Threat Model Compliance

- **T-10-01 (Tampering — i18n shape drift):** Mitigated. The `Translations` interface in `nl.ts` is the compile-time SOT, and en.ts/hi.ts are typed `: Translations`. Verified by `tsc --noEmit` passing — if any of the 10 keys were missing or misspelled in en.ts or hi.ts, the build would have failed.
- **T-10-02 (Information disclosure — accidentally putting EN text in Hindi file):** Visually verified. All 10 Hindi values use devanagari Unicode glyphs (no ASCII transliteration); the dismiss button is `'मैंने इसे पढ़ लिया है'` (verified by exact-match grep returning 1 hit in hi.ts and 0 in en.ts/nl.ts).

## Threat Flags

None — this plan is purely additive i18n strings; no new network endpoints, auth paths, file access patterns, or schema changes.

## Verification

All 13 acceptance gates from the plan passed:

| Gate | File | Expected | Actual |
|------|------|----------|--------|
| `client:` count | nl.ts | ≥2 | 2 |
| `client:` count | en.ts | ≥1 | 1 |
| `client:` count | hi.ts | ≥1 | 1 |
| `dismissButton:` count | nl.ts | ≥2 | 2 |
| Exact NL string `Ik heb het gelezen` | nl.ts | 1 | 1 |
| Exact EN string `I have read it` | en.ts | 1 | 1 |
| Exact HI devanagari `मैंने इसे पढ़ लिया है` | hi.ts | 1 | 1 |
| `megaphoneAriaLabel:` count | nl.ts | ≥2 | 2 |
| `sidebarTitle\|sidebarBackToList\|sidebarEmpty` count | nl.ts | ≥6 | 6 |
| `relativeTime*` keys count | nl.ts | ≥10 | 10 |
| `relativeTimeMinutes` count | en.ts | 1 | 1 |
| `relativeTimeMinutes` count | hi.ts | 1 | 1 |
| `operator: {` count unchanged | nl/en/hi | 2/1/1 | 2/1/1 |
| `npx tsc --noEmit` | (project-wide) | passes | passes |

## Self-Check: PASSED

- File `src/lib/i18n/translations/nl.ts` — modified (verified by `git log --oneline -1 src/lib/i18n/translations/nl.ts` shows commit `2e807fd`)
- File `src/lib/i18n/translations/en.ts` — modified (same commit)
- File `src/lib/i18n/translations/hi.ts` — modified (same commit)
- Commit `2e807fd` — exists in `git log --oneline --all`

## What Wave 2 Can Now Do

Plans 10-03 and 10-04 can write components that call:

```ts
const t = useT()
t('client.news.dismissButton')             // NL/EN/HI auto-resolved
t('client.news.megaphoneAriaLabel')        // for the megaphone <button aria-label={...}>
t('client.news.sidebarTitle')              // sidebar header
t('client.news.sidebarBackToList')         // detail-view back affordance
t('client.news.sidebarEmpty')              // empty-archive state
t('client.news.relativeTimeJustNow')       // sidebar list-item time
t('client.news.relativeTimeMinutes', { count: 5 })  // "5 min geleden" / "5 min ago"
t('client.news.relativeTimeHours',   { count: 2 })  // "2 uur geleden" / "2 h ago"
t('client.news.relativeTimeDays',    { count: 3 })  // "3 dagen geleden" / "3 days ago"
t('client.news.relativeTimeWeeks',   { count: 1 })  // "1 weken geleden" / "1 weeks ago"
```

— with TypeScript catching any typo at build time (the `Translations` interface narrows valid keys).

## Next Plan

**10-02** — `dismissNewsItem` server action at `src/app/(client)/dashboard/actions.ts` (Wave 2, parallel with 10-03/10-04).
