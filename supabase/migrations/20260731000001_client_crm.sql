-- ============================================================================
-- Migration: klant-CRM
--
-- Volledig additief. Het CRM leest zijn leads uit de BESTAANDE bronnen
-- (leads / campaign_leads, via getCampaignLeads) en schrijft daar nooit naar
-- terug. Alle CRM-specifieke data leeft in deze vier nieuwe tabellen, gekoppeld
-- aan de bron-lead via `lead_key` (= lowercase e-mailadres van de lead).
--
-- Waarom e-mail als koppelsleutel en niet lead_id: een klant kan zijn leads uit
-- twee verschillende tabellen krijgen (lead-inbox `leads` of handmatige
-- `campaign_leads`). Het e-mailadres is de enige sleutel die in beide bronnen
-- bestaat en stabiel blijft als een klant later omschakelt.
--
-- Effect op de lead-inbox: geen. Geen enkele bestaande tabel, kolom, index,
-- policy of trigger wordt aangeraakt.
-- ============================================================================

-- ─── Shared updated_at trigger ─────────────────────────────────────────────
create or replace function public.update_crm_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── 1. Labels (klant maakt zelf aan, vrij te kiezen kleur) ────────────────
create table public.crm_labels (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  name        text not null,
  color       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint crm_labels_client_name_unique unique (client_id, name)
);

create index idx_crm_labels_client on public.crm_labels(client_id);

create trigger trg_crm_labels_updated_at before update on public.crm_labels
  for each row execute function public.update_crm_updated_at();

-- ─── 2. Records: de CRM-laag bovenop een bron-lead ─────────────────────────
create table public.crm_records (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references public.clients(id) on delete cascade,
  lead_key            text not null,
  source_lead_id      text,
  stage               text not null default 'nieuw',
  priority            text not null default 'normaal',
  owner_name          text,
  contact_name        text,
  company_name        text,
  job_title           text,
  phone               text,
  website             text,
  linkedin_url        text,
  deal_value          numeric(14,2),
  expected_close_date date,
  next_action         text,
  next_action_at      date,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint crm_records_client_lead_unique unique (client_id, lead_key),
  constraint crm_records_stage_check check (
    stage in ('nieuw', 'contact', 'gekwalificeerd', 'voorstel', 'gewonnen', 'verloren')
  ),
  constraint crm_records_priority_check check (
    priority in ('laag', 'normaal', 'hoog')
  )
);

create index idx_crm_records_client on public.crm_records(client_id);
create index idx_crm_records_client_stage on public.crm_records(client_id, stage);

create trigger trg_crm_records_updated_at before update on public.crm_records
  for each row execute function public.update_crm_updated_at();

-- ─── 3. Junction record ↔ label ────────────────────────────────────────────
create table public.crm_record_labels (
  record_id  uuid not null references public.crm_records(id) on delete cascade,
  label_id   uuid not null references public.crm_labels(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (record_id, label_id)
);

create index idx_crm_record_labels_label on public.crm_record_labels(label_id);

-- ─── 4. Activiteiten-tijdlijn per record ───────────────────────────────────
create table public.crm_activities (
  id          uuid primary key default uuid_generate_v4(),
  record_id   uuid not null references public.crm_records(id) on delete cascade,
  type        text not null default 'notitie',
  body        text not null,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint crm_activities_type_check check (
    type in ('notitie', 'telefoon', 'email', 'meeting', 'taak', 'fase')
  )
);

create index idx_crm_activities_record on public.crm_activities(record_id, occurred_at desc);

create trigger trg_crm_activities_updated_at before update on public.crm_activities
  for each row execute function public.update_crm_updated_at();

-- ─── RLS ───────────────────────────────────────────────────────────────────
-- Zelfde patroon als de rest van de codebase: operator mag alles, klant ziet
-- alleen rijen van zijn eigen client_id (claim uit de custom access token hook).

alter table public.crm_labels enable row level security;

create policy "Operators full access to crm_labels" on public.crm_labels
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own crm_labels" on public.crm_labels
  for all to authenticated
  using (client_id::text = (select auth.jwt() ->> 'client_id'))
  with check (client_id::text = (select auth.jwt() ->> 'client_id'));

alter table public.crm_records enable row level security;

create policy "Operators full access to crm_records" on public.crm_records
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own crm_records" on public.crm_records
  for all to authenticated
  using (client_id::text = (select auth.jwt() ->> 'client_id'))
  with check (client_id::text = (select auth.jwt() ->> 'client_id'));

alter table public.crm_record_labels enable row level security;

create policy "Operators full access to crm_record_labels" on public.crm_record_labels
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own crm_record_labels" on public.crm_record_labels
  for all to authenticated
  using (
    exists (
      select 1 from public.crm_records r
      where r.id = crm_record_labels.record_id
        and r.client_id::text = (select auth.jwt() ->> 'client_id')
    )
  )
  with check (
    exists (
      select 1 from public.crm_records r
      where r.id = crm_record_labels.record_id
        and r.client_id::text = (select auth.jwt() ->> 'client_id')
    )
  );

alter table public.crm_activities enable row level security;

create policy "Operators full access to crm_activities" on public.crm_activities
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own crm_activities" on public.crm_activities
  for all to authenticated
  using (
    exists (
      select 1 from public.crm_records r
      where r.id = crm_activities.record_id
        and r.client_id::text = (select auth.jwt() ->> 'client_id')
    )
  )
  with check (
    exists (
      select 1 from public.crm_records r
      where r.id = crm_activities.record_id
        and r.client_id::text = (select auth.jwt() ->> 'client_id')
    )
  );
