-- ============================================================================
-- Migration: lead_inbox_initial_schema (Sprint 1 — nieuwegeldbesparendeinbox)
-- Architectuur: 1 Instantly workspace, meerdere klanten, meerdere campagnes per klant
-- 1 lead per (klant, email), replies als JSONB array op de lead.
--
-- Deze migration staat los van de bestaande inbox (synced_leads, inbox_folders,
-- inbox-embed). Geen wijzigingen aan bestaande tabellen.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ENUMS
create type lead_classification as enum (
  'positive', 'negative', 'neutral', 'spam', 'unknown'
);

create type customer_status as enum ('active', 'paused', 'archived');

create type anomaly_type as enum (
  'cross_campaign_lead', 'unknown_campaign', 'sending_account_mismatch',
  'duplicate_email_id', 'classification_failed', 'other'
);

-- TABLES
create table customers (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  notification_email  text not null,
  status              customer_status not null default 'active',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table campaigns (
  id                       uuid primary key default uuid_generate_v4(),
  customer_id              uuid not null references customers(id) on delete cascade,
  instantly_campaign_id    text not null unique,
  name                     text not null,
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index idx_campaigns_customer on campaigns(customer_id);
create index idx_campaigns_active   on campaigns(is_active) where is_active = true;

-- Leads: één rij per (customer_id, email). Hele thread leeft in JSONB.
-- Email = From Address Email uit Instantly (NIET het 'Lead' veld — From is leidend).
create table leads (
  id                  uuid primary key default uuid_generate_v4(),
  customer_id         uuid not null references customers(id) on delete cascade,
  email               text not null,
  name                text,

  classification      lead_classification not null,  -- permanent, NOOIT updaten
  thread_id           text,                          -- Instantly's Thread ID

  first_campaign_id   uuid not null references campaigns(id),
  sending_account     text not null,                 -- Eaccount: nodig om vanuit te reageren

  first_reply_at      timestamptz not null,
  last_reply_at       timestamptz not null,
  notified_at         timestamptz,

  -- replies array, nieuwste laatst. Per item:
  -- {
  --   instantly_email_id: text (Instantly 'ID' UUID),
  --   campaign_id: uuid (onze interne FK),
  --   sending_account: text,
  --   from_email: text,
  --   subject: text,
  --   body: text,
  --   received_at: timestamptz ISO string,
  --   ai_interest_value: int (Instantly's eigen classifier, referentie),
  --   classification: lead_classification (onze eigen, per reply),
  --   raw_payload: object (originele response, voor debug)
  -- }
  replies             jsonb not null default '[]'::jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint leads_customer_email_unique unique (customer_id, email)
);

create index idx_leads_customer       on leads(customer_id);
create index idx_leads_classification on leads(classification);
create index idx_leads_last_reply     on leads(last_reply_at desc);
create index idx_leads_thread_id      on leads(thread_id);
create index idx_leads_notified_pending on leads(created_at) where notified_at is null;
create index idx_leads_replies_gin    on leads using gin (replies jsonb_path_ops);

-- Anomalies: alles wat niet klopt wordt gelogd, niet gemaskeerd.
create table anomalies (
  id            uuid primary key default uuid_generate_v4(),
  type          anomaly_type not null,
  customer_id   uuid references customers(id) on delete set null,
  lead_id       uuid references leads(id)     on delete set null,
  campaign_id   uuid references campaigns(id) on delete set null,
  details       jsonb not null default '{}'::jsonb,
  resolved      boolean not null default false,
  created_at    timestamptz not null default now()
);

create index idx_anomalies_unresolved on anomalies(created_at desc) where resolved = false;
create index idx_anomalies_type       on anomalies(type);

-- TRIGGERS
create or replace function update_lead_inbox_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_customers_updated_at before update on customers
  for each row execute function update_lead_inbox_updated_at();
create trigger trg_campaigns_updated_at before update on campaigns
  for each row execute function update_lead_inbox_updated_at();
create trigger trg_leads_updated_at before update on leads
  for each row execute function update_lead_inbox_updated_at();

-- HELPER FUNCTIONS
-- Dedup-check voor Make: is deze instantly_email_id al verwerkt?
create or replace function reply_already_processed(p_instantly_email_id text)
returns boolean as $$
begin
  return exists (
    select 1 from leads
    where replies @> jsonb_build_array(
      jsonb_build_object('instantly_email_id', p_instantly_email_id)
    )
  );
end;
$$ language plpgsql stable;

-- Retention: leads ouder dan N maanden weggooien (default 4).
create or replace function cleanup_old_leads(retention_months int default 4)
returns int as $$
declare deleted_count int;
begin
  with deleted as (
    delete from leads
    where last_reply_at < now() - (retention_months || ' months')::interval
    returning 1
  )
  select count(*) into deleted_count from deleted;
  return deleted_count;
end;
$$ language plpgsql;

-- RLS staat UIT — service-role key vanuit Make en backend werkt direct.
-- Aanzetten zodra dashboard met user-tokens praat.
alter table customers  disable row level security;
alter table campaigns  disable row level security;
alter table leads      disable row level security;
alter table anomalies  disable row level security;
