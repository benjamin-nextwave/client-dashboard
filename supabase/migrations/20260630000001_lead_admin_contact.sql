-- Admin-added decision-maker contact details for a lead ("doorverwijzing").
-- When a lead replies "you need to be with HR for this" without sharing
-- contact details, the operator manually fills in the decision-maker's info
-- here. It surfaces as a prominent red box in the client's inbox lead view.
--
-- `admin_contact_none = true` means: the operator looked but found no contact
-- details, which is shown to the client as an explicit "no details found" note.

alter table synced_leads
  add column if not exists admin_contact_name         text,
  add column if not exists admin_contact_email        text,
  add column if not exists admin_contact_linkedin_url text,
  add column if not exists admin_contact_job_title    text,
  add column if not exists admin_contact_none         boolean not null default false,
  add column if not exists admin_contact_updated_at   timestamptz;

-- Clients already have a SELECT policy on their own synced_leads rows, so the
-- new columns are readable by the client dashboard without extra policies.
-- Operators write these columns via the service-role client (RLS bypassed).
