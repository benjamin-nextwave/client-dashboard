# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard -- keeping the entire outreach workflow in one place.

**Current focus:** Phase 4 -- Instantly.ai Integration & Campaign Stats (COMPLETE)

## Current Position

Phase: 4 of 8 (Instantly.ai Integration & Campaign Stats)
Plan: 5 of 5 in current phase
Status: Phase complete -- all 5 plans done
Last activity: 2026-02-15 -- Completed 04-05-PLAN.md (Overzicht dashboard verification APPROVED)

Progress: [█████████████░] 13/~20 total plans (5/5 in phase 4)

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: ~4 min
- Total execution time: ~43 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-multi-tenancy | 3/3 | ~20 min | ~7 min |
| 02-operator-admin-core | 3/3 | ~10 min | ~3 min |
| 03-client-dashboard-shell-branding | 2/2 | ~5 min | ~2.5 min |
| 04-instantly-ai-integration-campaign-stats | 5/5 | ~9 min | ~1.8 min |

**Recent Trend:**
- Last 5 plans: 04-02 (~2 min), 04-03 (~2 min), 04-04 (~2 min), 04-05 (~1 min)
- Trend: Consistent fast execution

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **Supabase over Neon**: Integrated auth + storage + Postgres in one platform (Pending)
- **Primary color + logo only for branding**: Keeps white-labeling simple, sufficient for client differentiation (Pending)
- **Instantly handles sentiment**: Avoids building our own NLP, Instantly already classifies replies (Pending)
- **All operators are equal admins**: Only 3 operators, no need for granular permissions (Pending)
- **Next.js 15.5.12 over 16**: Better Supabase compatibility per research (01-01)
- **RLS (SELECT auth.jwt()) wrappers**: All policies use subselect for 95%+ performance improvement (01-01)
- **pgTAP throws_ok with 42501**: Using PostgreSQL error code for INSERT denial tests validates RLS policy-level blocking (01-03)
- **useActionState for login form**: React 19 pattern for server action state management (01-02)
- **Middleware handles authenticated /login visits**: Prevents stuck state by redirecting to dashboard (01-02)
- **Dutch UI labels**: Inloggen, Uitloggen, Welkom throughout the app (01-02)
- **Admin client for storage uploads**: service_role bypasses storage RLS, safe since only operators trigger from Server Actions (02-01)
- **Dutch Zod validation messages**: Consistent with Dutch UI convention from Phase 1 (02-01)
- **No-store cache on Instantly API**: Operators need fresh campaign data, no caching (02-01)
- **force-dynamic on admin pages**: Admin client requires runtime env vars, cannot prerender (02-02)
- **useActionState + RHF for forms**: Server action state for errors + React Hook Form for client validation display (02-02)
- **Campaign names in hidden inputs**: Avoids re-fetching from Instantly during server action (02-02)
- **Optional password on edit**: Only updates auth user password if non-empty, avoids accidental resets (02-03)
- **Campaign re-association via delete + re-insert**: Simpler than diffing, safe within single action (02-03)
- **Hidden originalEmail for change detection**: Avoids extra DB query in updateClient action (02-03)
- **Inline SVG icons over icon library**: Zero extra dependencies for sidebar nav icons (03-01)
- **signOutAction as prop**: Server action defined in server layout, passed to client SidebarNav component (03-01)
- **CSS variable on wrapper div (not :root)**: Prevents brand color leakage between tenants (03-01)
- **Server components for placeholder pages**: No client-side state needed for static content pages (03-02)
- **Branded accent elements**: Overzicht page demonstrates theme integration with colored border accent (03-02)
- **getHeaders() function over module-level const**: Bearer token evaluated at call time, not import time (04-01)
- **90-day rolling sync window**: Covers 3 months of campaign data without overloading API (04-01)
- **500ms inter-campaign delay**: Conservative rate limiting for Instantly API (04-01)
- **Batch upserts of 500 leads**: Prevents Supabase payload size limits on large lead sets (04-01)
- **TypeScript-side aggregation**: Supabase JS client lacks GROUP BY; fetch rows and aggregate in TS for manageable dataset sizes (04-02)
- **Email dedup via Set**: Contacts span campaigns; Set on email field for distinct counts (04-02)
- **Dutch status labels in data layer**: lead_status mapped to Dutch labels at query function level (04-02)
- **Client wrapper pattern for server/client boundary**: OverzichtDashboard manages modal state while page.tsx stays server component (04-04)
- **Brand color opacity via RGB mixing**: Solid chart fills at varying intensities instead of CSS opacity (04-04)

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 4 & 5 Research Required:**
- Instantly.ai API documentation has LOW confidence -- exact endpoints, rate limits, authentication flow, and email threading header availability (Message-ID, In-Reply-To, References) need verification before planning these phases
- Recommended action: Run `/gsd:research-phase 4` before planning Phase 4

**CSV Processing at Scale:**
- CSV import for 20k+ rows may hit Vercel timeout/memory limits
- Mitigation planned in Phase 6 with batched client-side parsing

**User Setup Required (01-01):**
- Supabase project must be created and env vars configured before local dev
- Custom Access Token Hook must be manually enabled in Supabase Dashboard after migration deployment

**User Setup Required (02-01):**
- INSTANTLY_API_KEY environment variable needed for campaign listing (requires Instantly.ai Growth plan)

## Session Continuity

Last session: 2026-02-15 (plan 04-05 verification approved)
Stopped at: Phase 4 complete -- 13 plans total completed
Resume file: .planning/phases/04-instantly-ai-integration-campaign-stats/04-05-SUMMARY.md

---
*State initialized: 2026-02-15*
*Last updated: 2026-02-15*
