# Requirements: NextWave Solutions Client Dashboard Platform

**Defined:** 2026-02-15
**Core Value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication & Multi-tenancy

- [ ] **AUTH-01**: Operator can log in with admin credentials and access all client dashboards
- [ ] **AUTH-02**: Client can log in with operator-provisioned credentials and access only their own dashboard
- [ ] **AUTH-03**: All database tables enforce row-level security via client_id, preventing cross-tenant data access
- [ ] **AUTH-04**: User session persists across browser refresh without re-authentication

### Operator Admin

- [ ] **OADM-01**: Operator can create a new client dashboard with company name, username, email, password, recruitment toggle, primary color, logo, and meeting URL
- [ ] **OADM-02**: Operator can select one or more Instantly campaigns to associate with a client dashboard
- [ ] **OADM-03**: Operator can edit existing client settings (branding, credentials, campaigns, recruitment toggle, meeting URL)
- [ ] **OADM-04**: Operator can upload a CSV for a client's 7-day preview, preserving all original columns in JSONB
- [ ] **OADM-05**: Operator can apply one-click DNC filtering that removes: client-removed contacts, DNC email matches, and DNC domain matches
- [ ] **OADM-06**: Operator can export a cleaned CSV with all original columns intact after DNC filtering
- [ ] **OADM-07**: Operator can view an error monitoring dashboard showing API failures, import errors, and sync issues with client name, error type, timestamp, and resolution status

### Campaign Statistics (Overzicht)

- [ ] **STAT-01**: Client sees "Reactie vereist" alert banner showing count of unanswered positive replies
- [ ] **STAT-02**: Client sees "Totaal aantal reacties deze maand" — total replies this month
- [ ] **STAT-03**: Client sees "Geleverde leads deze maand" — positive/interested replies this month
- [ ] **STAT-04**: Client sees "Contacten in database" with a button opening a modal showing the full contact list
- [ ] **STAT-05**: Client sees "Verzonden mails" — total emails sent across all associated campaigns
- [ ] **STAT-06**: Client sees a contact status chart (bar/stacked bar) showing emailed, not yet emailed, replied, bounced statuses
- [ ] **STAT-07**: Client sees an industry breakdown pie/donut chart from contact list data
- [ ] **STAT-08**: Client sees a job title breakdown chart from contact list data
- [ ] **STAT-09**: Client sees ICP Vorming section with static charts showing common patterns among positive leads (industry, job title, company size)
- [ ] **STAT-10**: Campaign data is aggregated across all associated Instantly campaigns — client never sees campaign names or count

### Inbox

- [ ] **INBX-01**: Client sees a Gmail-style inbox list showing only positive replies with sender name, company, subject, preview text, and date/time
- [ ] **INBX-02**: Client can click a reply to open full conversation thread with all contact details (name, company, job title, email, LinkedIn)
- [ ] **INBX-03**: Client can reply to a lead directly from the dashboard, sent from the original sender account with proper email threading headers (In-Reply-To, References)
- [ ] **INBX-04**: Client can compose a new outbound email to any positive lead via "Nieuwe Email" button, sent from the original sender account
- [ ] **INBX-05**: Each lead displays a status label: "Nieuwe lead" (no response sent yet) or "In gesprek" (conversation ongoing)
- [ ] **INBX-06**: For recruitment clients, the inbox contact details include the vacancy/job posting URL

### Contact Preview

- [ ] **PREV-01**: Client sees a 7-day preview table of upcoming contacts with columns: full name, company name, contact date, sector/industry, job title
- [ ] **PREV-02**: Client can remove individual contacts from the preview with a delete button, preventing those contacts from being emailed
- [ ] **PREV-03**: Removed contacts are flagged and excluded during operator's DNC filtering export

### Do Not Contact

- [ ] **DNC-01**: Client can manually add individual email addresses to their do-not-contact list
- [ ] **DNC-02**: Client can add entire domains (e.g., @domein.nl) to block all emails to that company
- [ ] **DNC-03**: Client can upload a CSV with an "Email" column to bulk-add addresses to the DNC list
- [ ] **DNC-04**: Client can view their current DNC list (emails and domains) and remove entries
- [ ] **DNC-05**: DNC list is applied during operator CSV export filtering (both email and domain matching)

### Sent Emails

- [ ] **SENT-01**: Client sees a read-only sent mailbox view of all outgoing campaign emails
- [ ] **SENT-02**: Client can click a sent email to view full details (recipient, subject, body, date/time)
- [ ] **SENT-03**: No reply, forward, or compose actions available on the sent emails page

### Meetings

- [ ] **MEET-01**: Client meetings page redirects to an external URL configured per client by the operator
- [ ] **MEET-02**: If no custom meeting URL is set, redirect to the default NextWave meetings URL

### White-Label Branding

- [ ] **BRND-01**: Each client dashboard displays the client's company logo in the navigation
- [ ] **BRND-02**: Each client dashboard applies the client's primary color as the brand color throughout the UI
- [ ] **BRND-03**: All client-facing pages display text in Dutch (Nederlands)

### Instantly.ai Integration

- [ ] **INST-01**: System syncs campaign statistics from Instantly.ai API for each client's associated campaigns
- [ ] **INST-02**: System fetches reply content and sentiment classification from Instantly.ai
- [ ] **INST-03**: System sends emails and replies through Instantly.ai using the original sender account
- [ ] **INST-04**: System tracks which sender account was used for each contact to enable proper reply routing

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Authentication

- **AUTH-V2-01**: Client can change their own password from the dashboard
- **AUTH-V2-02**: Magic link login for clients

### Advanced Analytics

- **ANLZ-V2-01**: Automated ICP analysis with AI-powered pattern detection
- **ANLZ-V2-02**: Real-time websocket updates for inbox and stats

### Notifications

- **NOTF-V2-01**: Email notification to client when new positive reply received
- **NOTF-V2-02**: In-app notification badges

### Internationalization

- **I18N-V2-01**: i18n framework for multi-language support (currently hardcoded Dutch)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web responsive is sufficient, desktop-first usage pattern |
| Full email client (threads, attachments, CC/BCC) | Goal is replying to positive leads, not replacing Gmail |
| AI-powered lead scoring | Requires ML pipeline, high cost/low accuracy at 15-client scale |
| Client self-service onboarding | Agency acquires clients through sales, not self-serve SaaS |
| Operator permission levels | Only 3 operators, all equal admins |
| Real-time chat/messaging | Not part of the outreach workflow |
| Custom fonts/secondary colors | Primary color + logo sufficient for v1 branding |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| — | — | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 0
- Unmapped: 38

---
*Requirements defined: 2026-02-15*
*Last updated: 2026-02-15 after initial definition*
