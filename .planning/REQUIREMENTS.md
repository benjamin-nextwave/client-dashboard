# Requirements: NextWave Solutions Client Dashboard Platform — Milestone v1.1

**Defined:** 2026-04-29
**Core Value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.
**Milestone goal:** Operators can broadcast multilingual news/announcements to all client dashboards via a persistent overlay-on-open + sidebar archive, with controlled retraction.

## v1.1 Requirements

Requirements for the News Broadcasting milestone. Each maps to roadmap phases.

### News Authoring (Operator)

- [x] **NEWS-01**: Operator can create a news item with an image, title, and body, providing variants in Dutch, English, and Hindi (devanagari)
- [x] **NEWS-02**: Operator can edit any field of any language variant of an existing news item
- [x] **NEWS-03**: Operator can publish a draft news item, after which it becomes visible to all client dashboards
- [x] **NEWS-04**: Operator can withdraw a published news item, after which it disappears from all client dashboards
- [x] **NEWS-05**: Operator can see a list of all news items showing status (draft / published / withdrawn) and creation/publish timestamps
- [x] **NEWS-06**: Operator can preview a news item in any of its language variants before publishing

### Client News Delivery

- [ ] **DELIVER-01**: Client sees an unread published news item as a full-screen overlay when opening their dashboard
- [ ] **DELIVER-02**: Overlay displays the news image, title, and body in a single language variant
- [ ] **DELIVER-03**: Overlay can only be dismissed via a single button labeled "Ik heb het gelezen" (or its translation in the active language)
- [x] **DELIVER-04**: Once a client dismisses a news item, that user never sees the same item as an overlay again
- [ ] **DELIVER-05**: A withdrawn news item disappears from any active overlay queue and from the sidebar within one page reload

### Client News Archive

- [ ] **ARCH-01**: Client topbar shows a megaphone button immediately to the left of the existing "Ververs data" button
- [ ] **ARCH-02**: Clicking the megaphone button opens a sidebar listing all currently-published (non-withdrawn) news items, ordered most-recent first
- [ ] **ARCH-03**: Each sidebar item shows the title and a short text preview
- [ ] **ARCH-04**: Clicking a sidebar item displays the full news content (image + title + body) in the same panel or an expanded view

## Future Requirements

Acknowledged ideas not in this milestone.

### News Targeting

- **TARGET-01**: Operator can target news to specific clients or tenants (instead of broadcast-to-all)
- **TARGET-02**: Operator can schedule a news item to publish/withdraw at a future date

### Engagement

- **ENGAGE-01**: Operator can see read/dismiss counts per news item
- **ENGAGE-02**: News item can include a call-to-action button linking to a URL

## Out of Scope

Explicitly excluded for this milestone.

| Feature | Reason |
|---------|--------|
| Per-client or per-tenant targeting | This milestone broadcasts to ALL clients; targeting deferred to v1.2 |
| Scheduled publish/withdraw | Operator manually toggles state; scheduling deferred to v1.2 |
| Push notifications / email alerts | Overlay-on-open is the delivery mechanism; out-of-band alerts not in scope |
| Rich-text formatting (markdown / WYSIWYG) | Plain text + image is sufficient for v1.1 |
| Multiple images per news item | One image per news item — keeps authoring + layout simple |
| Read/dismiss analytics | No engagement metrics in v1.1 |
| Auto-translation between languages | Operator authors all 3 variants manually |
| Languages beyond NL / EN / Hindi | Three languages cover current client base |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| NEWS-01 | Phase 9 | Complete (09-05, awaiting 09-06 DB push for live verification) |
| NEWS-02 | Phase 9 | Complete (09-05, awaiting 09-06 DB push for live verification) |
| NEWS-03 | Phase 9 | Complete (09-05, awaiting 09-06 DB push for live verification) |
| NEWS-04 | Phase 9 | Complete (09-05, awaiting 09-06 DB push for live verification) |
| NEWS-05 | Phase 9 | Complete (09-05, awaiting 09-06 DB push for live verification) |
| NEWS-06 | Phase 9 | Complete (09-04, awaiting 09-06 DB push for live verification) |
| DELIVER-01 | Phase 10 | Pending |
| DELIVER-02 | Phase 10 | Pending |
| DELIVER-03 | Phase 10 | Pending |
| DELIVER-04 | Phase 10 | Complete (10-02 dismiss action; overlay query in 10-05 will close the loop) |
| DELIVER-05 | Phase 10 | Pending |
| ARCH-01 | Phase 10 | Pending |
| ARCH-02 | Phase 10 | Pending |
| ARCH-03 | Phase 10 | Pending |
| ARCH-04 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 15 total
- Mapped to phases: 15 ✓
- Unmapped: 0

---
*Requirements defined: 2026-04-29*
*Last updated: 2026-04-30 — DELIVER-04 marked complete after 10-02 (dismissNewsItem server action); overlay-side filter query still pending in 10-05*
