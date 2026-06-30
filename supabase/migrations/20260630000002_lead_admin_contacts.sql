-- Unified "doorverwijzing" contact store, keyed by (client + lead email).
--
-- A lead can surface from three different tables — synced_leads (Instantly
-- inbox), campaign_leads (operator-curated), and leads (lead-inbox) — so we
-- don't hang the admin-added decision-maker details on any single lead table.
-- Instead we key on the lead's email address, which is stable across sources.
--
-- `contact_none = true` means the operator looked but found no details, shown
-- to the client as an explicit "no details found" note. Emails are stored
-- lowercased so the (client_id, lead_email) unique constraint is reliable.

create table if not exists lead_admin_contacts (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references clients(id) on delete cascade,
  lead_email          text not null,
  contact_name        text,
  contact_email       text,
  contact_linkedin_url text,
  contact_job_title   text,
  contact_none        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (client_id, lead_email)
);

create index if not exists idx_lead_admin_contacts_client
  on lead_admin_contacts (client_id);

alter table lead_admin_contacts enable row level security;

-- Clients may read the referral details for their own leads.
create policy "Clients can read own admin contacts"
  on lead_admin_contacts
  for select
  using ((auth.jwt() ->> 'client_id')::uuid = client_id);

-- Operators have full access (also covered by the service-role client).
create policy "Operators manage admin contacts"
  on lead_admin_contacts
  for all
  to authenticated
  using ((auth.jwt() ->> 'user_role') = 'operator')
  with check ((auth.jwt() ->> 'user_role') = 'operator');

-- The earlier per-lead columns on synced_leads (migration 20260630000001) are
-- now unused; they are left in place (nullable) and can be dropped later.
