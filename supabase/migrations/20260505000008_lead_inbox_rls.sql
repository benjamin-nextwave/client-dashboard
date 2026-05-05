-- ============================================================================
-- Migration: lead-inbox RLS — alle tabellen achter row-level security
--
-- Tot nu toe stond RLS uit op alle lead-inbox tabellen (zie comment in
-- 20260504000001_lead_inbox_initial_schema.sql: "Aanzetten zodra dashboard
-- met user-tokens praat."). Sinds de wire-up van clients.lead_inbox_customer_id
-- in 8cae115 leest het dashboard met user-tokens (createClient(), niet
-- createAdminClient()) — dus nu kunnen we RLS aanzetten zonder Make of
-- admin-routes te breken:
--
-- - Make.com (service_role)         bypasst RLS automatisch.
-- - Admin-routes (createAdminClient) bypassen ook (service_role).
-- - Operator-rol (auth.jwt user_role='operator') krijgt FOR ALL policies
--   voor consistentie met de rest van de codebase.
-- - Klanten (auth.jwt user_role='client') zien alleen hun eigen
--   customer_id-rijen, hard gegate door BEIDE
--     clients.lead_inbox_visible = TRUE
--     clients.lead_inbox_customer_id IS NOT NULL
--   via current_lead_inbox_customer_id() helper.
-- ============================================================================

-- ─── Helper ────────────────────────────────────────────────────────────────
-- Resolve de lead-inbox customer_id voor de ingelogde gebruiker, of NULL als
-- de slider uit staat / niet gekoppeld is. STABLE zodat de planner de waarde
-- per query cached.
create or replace function public.current_lead_inbox_customer_id()
returns uuid
language sql
stable
security invoker
as $$
  select c.lead_inbox_customer_id
  from public.clients c
  where c.id::text = (select auth.jwt() ->> 'client_id')
    and c.lead_inbox_visible = true
    and c.lead_inbox_customer_id is not null
$$;

comment on function public.current_lead_inbox_customer_id() is
  'Geeft de lead_inbox customer_id terug voor de ingelogde klant, of NULL als '
  'de slider uit staat of er geen customer gekoppeld is. Gate-check voor RLS '
  'policies op de lead-inbox tabellen.';

-- ─── customers ────────────────────────────────────────────────────────────
alter table public.customers enable row level security;

create policy "Operators full access to customers" on public.customers
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients can view own customer" on public.customers
  for select to authenticated
  using (id = current_lead_inbox_customer_id());

-- ─── campaigns ────────────────────────────────────────────────────────────
alter table public.campaigns enable row level security;

create policy "Operators full access to campaigns" on public.campaigns
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients can view own campaigns" on public.campaigns
  for select to authenticated
  using (customer_id = current_lead_inbox_customer_id());

-- ─── leads ────────────────────────────────────────────────────────────────
-- Klant: SELECT (lijst+detail), UPDATE (deleted_at trash/restore), DELETE
-- (permanent delete uit prullenbak). INSERT alleen door Make (service_role).
alter table public.leads enable row level security;

create policy "Operators full access to leads" on public.leads
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients can view own leads" on public.leads
  for select to authenticated
  using (customer_id = current_lead_inbox_customer_id());

create policy "Clients can update own leads" on public.leads
  for update to authenticated
  using (customer_id = current_lead_inbox_customer_id())
  with check (customer_id = current_lead_inbox_customer_id());

create policy "Clients can delete own leads" on public.leads
  for delete to authenticated
  using (customer_id = current_lead_inbox_customer_id());

-- ─── anomalies ────────────────────────────────────────────────────────────
-- Geen client-pad in code, maar SELECT-policy defensief voor het geval een
-- toekomstige feature 'm gaat lezen.
alter table public.anomalies enable row level security;

create policy "Operators full access to anomalies" on public.anomalies
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients can view own anomalies" on public.anomalies
  for select to authenticated
  using (customer_id = current_lead_inbox_customer_id());

-- ─── outbound_replies ─────────────────────────────────────────────────────
-- Klant leest (status van eigen verzonden replies), Make schrijft via
-- service_role.
alter table public.outbound_replies enable row level security;

create policy "Operators full access to outbound_replies" on public.outbound_replies
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients can view own outbound_replies" on public.outbound_replies
  for select to authenticated
  using (customer_id = current_lead_inbox_customer_id());

-- ─── lead_inbox_user_labels ───────────────────────────────────────────────
-- Klant CRUD'd eigen labels via createLabel/deleteLabel server actions.
alter table public.lead_inbox_user_labels enable row level security;

create policy "Operators full access to lead_inbox_user_labels"
  on public.lead_inbox_user_labels
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own lead_inbox_user_labels"
  on public.lead_inbox_user_labels
  for all to authenticated
  using (customer_id = current_lead_inbox_customer_id())
  with check (customer_id = current_lead_inbox_customer_id());

-- ─── lead_inbox_lead_label_assignments ────────────────────────────────────
-- Junction (lead_id, label_id), geen customer_id-kolom. Eigenaarschap via
-- leads.customer_id-keten. Klant assignt/unassignt via assignLabel/unassignLabel.
alter table public.lead_inbox_lead_label_assignments enable row level security;

create policy "Operators full access to lead_inbox_lead_label_assignments"
  on public.lead_inbox_lead_label_assignments
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own lead_inbox_lead_label_assignments"
  on public.lead_inbox_lead_label_assignments
  for all to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_inbox_lead_label_assignments.lead_id
        and l.customer_id = current_lead_inbox_customer_id()
    )
  )
  with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_inbox_lead_label_assignments.lead_id
        and l.customer_id = current_lead_inbox_customer_id()
    )
  );

-- ─── lead_inbox_lead_notes ────────────────────────────────────────────────
-- Geen customer_id-kolom. Eigenaarschap via leads.customer_id-keten.
-- Klant doet createNote / updateNote / deleteNote.
alter table public.lead_inbox_lead_notes enable row level security;

create policy "Operators full access to lead_inbox_lead_notes"
  on public.lead_inbox_lead_notes
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients manage own lead_inbox_lead_notes"
  on public.lead_inbox_lead_notes
  for all to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_inbox_lead_notes.lead_id
        and l.customer_id = current_lead_inbox_customer_id()
    )
  )
  with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_inbox_lead_notes.lead_id
        and l.customer_id = current_lead_inbox_customer_id()
    )
  );

-- ─── lead_inbox_objections ────────────────────────────────────────────────
-- Code-pad gaat 100% via createAdminClient (service_role bypass). Defensief
-- toch een SELECT-policy voor klanten. Heeft client_id-kolom (referentie naar
-- clients), niet customer_id, dus simpele JWT-match werkt.
alter table public.lead_inbox_objections enable row level security;

create policy "Operators full access to lead_inbox_objections"
  on public.lead_inbox_objections
  for all to authenticated
  using ((select auth.jwt() ->> 'user_role') = 'operator')
  with check ((select auth.jwt() ->> 'user_role') = 'operator');

create policy "Clients can view own lead_inbox_objections"
  on public.lead_inbox_objections
  for select to authenticated
  using (client_id::text = (select auth.jwt() ->> 'client_id'));
