-- ============================================================================
-- Migration: CRM-koppelingen (HubSpot, Pipedrive)
--
-- Eén tabel met de door de klant ingevoerde API-credentials per externe CRM.
-- De credentials verlaten de server nooit: alle queries richting de browser
-- selecteren expliciet de kolommen zónder `credentials`, en het versturen
-- gebeurt uitsluitend in server actions.
--
-- Additief; raakt geen bestaande tabel aan.
-- ============================================================================

create table public.crm_connections (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  provider            text not null,
  name                text not null,
  credentials         jsonb not null default '{}'::jsonb,
  last_export_at      timestamptz,
  last_export_status  text,
  last_export_message text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint crm_connections_client_name_unique unique (client_id, name),
  constraint crm_connections_provider_check check (provider in ('hubspot', 'pipedrive')),
  constraint crm_connections_status_check check (
    last_export_status is null or last_export_status in ('success', 'partial', 'error')
  )
);

create index idx_crm_connections_client on public.crm_connections(client_id);

create trigger trg_crm_connections_updated_at before update on public.crm_connections
  for each row execute function public.update_crm_updated_at();

alter table public.crm_connections enable row level security;

create policy "Operators full access to crm_connections" on public.crm_connections
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own crm_connections" on public.crm_connections
  for all to authenticated
  using (client_id::text = (select auth.jwt() ->> 'client_id'))
  with check (client_id::text = (select auth.jwt() ->> 'client_id'));
