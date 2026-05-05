-- ============================================================================
-- Migration: lead-inbox v1.2 — custom labels, notes, prullenbak, handtekening
--
-- Vier additieve toevoegingen, allemaal scoped op de nieuwe lead-inbox.
-- Geen wijzigingen aan bestaande tabellen die door Make worden geschreven
-- (replies-flow ongemoeid).
-- ============================================================================

-- 1. Custom labels per klant. Klant maakt zelf aan, hangt aan customers.
create table lead_inbox_user_labels (
  id          uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  name        text not null,
  color       text not null,             -- hex of presetnaam, vrij opslagformaat
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint lead_inbox_user_labels_customer_name_unique unique (customer_id, name)
);

create index idx_lead_inbox_user_labels_customer on lead_inbox_user_labels(customer_id);

create trigger trg_lead_inbox_user_labels_updated_at before update on lead_inbox_user_labels
  for each row execute function update_lead_inbox_updated_at();

-- 2. Junction: welke labels hangen aan welke leads. Many-to-many.
create table lead_inbox_lead_label_assignments (
  lead_id    uuid not null references leads(id) on delete cascade,
  label_id   uuid not null references lead_inbox_user_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, label_id)
);

create index idx_lead_inbox_lead_label_assignments_label on lead_inbox_lead_label_assignments(label_id);

-- 3. Meerdere notities per lead, elk met eigen kleur.
create table lead_inbox_lead_notes (
  id         uuid primary key default uuid_generate_v4(),
  lead_id    uuid not null references leads(id) on delete cascade,
  body       text not null,
  color      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lead_inbox_lead_notes_lead on lead_inbox_lead_notes(lead_id);

create trigger trg_lead_inbox_lead_notes_updated_at before update on lead_inbox_lead_notes
  for each row execute function update_lead_inbox_updated_at();

-- 4. Soft-delete (prullenbak) op leads.
alter table leads add column deleted_at timestamptz;

-- Partial index voor snellere "actieve" queries (geen prullenbak-leads).
create index idx_leads_active_customer
  on leads(customer_id, last_reply_at desc)
  where deleted_at is null;

-- Partial index voor de prullenbak zelf.
create index idx_leads_trashed_customer
  on leads(customer_id, deleted_at desc)
  where deleted_at is not null;

-- 5. Handtekening op klant-niveau (operator beheerd).
alter table clients add column email_signature text;

-- RLS uit (consistent met de rest van lead-inbox).
alter table lead_inbox_user_labels disable row level security;
alter table lead_inbox_lead_label_assignments disable row level security;
alter table lead_inbox_lead_notes disable row level security;
