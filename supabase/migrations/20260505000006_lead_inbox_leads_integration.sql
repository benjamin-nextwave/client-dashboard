-- ============================================================================
-- Migration: lead_inbox ↔ Leads-pagina integratie
--
-- Twee toevoegingen, allebei additief:
--
-- 1. clients.lead_inbox_customer_id — pointer naar customers(id) zodat we per
--    klant weten welke lead-inbox customer-row z'n leads voedt. Nullable: voor
--    klanten zonder lead-inbox heeft dit geen functie.
--
-- 2. lead_inbox_objections — aparte tabel voor bezwaren die klanten indienen
--    op auto-gegenereerde leads (uit lead-inbox). De bestaande campaign_leads
--    objection_* velden blijven van toepassing op handmatige leads. Deze
--    tabel volgt dezelfde shape, met één bezwaar per lead.
-- ============================================================================

alter table clients
  add column lead_inbox_customer_id uuid references customers(id) on delete set null;

create index idx_clients_lead_inbox_customer
  on clients(lead_inbox_customer_id)
  where lead_inbox_customer_id is not null;

create table lead_inbox_objections (
  id                          uuid primary key default uuid_generate_v4(),
  lead_id                     uuid not null references leads(id) on delete cascade,
  client_id                   uuid not null references clients(id) on delete cascade,
  text                        text not null,
  proposed_label              lead_classification not null,
  proposed_label_note         text,
  submitted_at                timestamptz not null default now(),
  status                      text not null default 'pending'
                              check (status in ('pending', 'approved', 'rejected')),
  response                    text,
  resolved_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  constraint lead_inbox_objections_lead_unique unique (lead_id)
);

create index idx_lead_inbox_objections_client_status
  on lead_inbox_objections(client_id, status);
create index idx_lead_inbox_objections_pending
  on lead_inbox_objections(submitted_at desc) where status = 'pending';

create trigger trg_lead_inbox_objections_updated_at before update on lead_inbox_objections
  for each row execute function update_lead_inbox_updated_at();

alter table lead_inbox_objections disable row level security;
