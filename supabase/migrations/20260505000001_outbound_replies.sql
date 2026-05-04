-- ============================================================================
-- Migration: outbound_replies (Sprint 4 — reply functionaliteit)
--
-- Voegt een queue-tabel toe waar het dashboard een rij in schrijft als de
-- gebruiker op een lead reageert. Make.com pollt 'queued' rijen, triggert de
-- Instantly-reply-module, en zet status op 'sent' (of 'failed'). Make appendt
-- bovendien een nieuwe entry aan leads.replies (met direction='outbound') en
-- bumpt last_reply_at, zodat de thread compleet blijft.
--
-- Voegt 'direction' toe aan elke entry van bestaande leads.replies JSONB.
-- Bestaande data is allemaal inbound (klant-replies); backfill is idempotent.
-- ============================================================================

create type outbound_reply_status as enum ('queued', 'sending', 'sent', 'failed');

create table outbound_replies (
  id                    uuid primary key default uuid_generate_v4(),
  lead_id               uuid not null references leads(id) on delete cascade,
  customer_id           uuid not null references customers(id) on delete cascade,

  -- Verwijzing naar het bericht waarop wordt gereageerd (Instantly's email ID)
  in_reply_to_email_id  text not null,
  thread_id             text,

  -- Verzendcontext (door dashboard ingevuld bij verzenden)
  sending_account       text not null,
  to_email              text not null,
  subject               text not null,
  body                  text not null,

  -- Status machine voor Make
  status                outbound_reply_status not null default 'queued',
  error_message         text,

  -- Resultaat (door Make ingevuld)
  sent_at               timestamptz,
  instantly_email_id    text,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_outbound_replies_lead     on outbound_replies(lead_id);
create index idx_outbound_replies_customer on outbound_replies(customer_id);
create index idx_outbound_replies_queued   on outbound_replies(created_at) where status = 'queued';
create index idx_outbound_replies_pending  on outbound_replies(lead_id) where status in ('queued', 'sending');

create trigger trg_outbound_replies_updated_at before update on outbound_replies
  for each row execute function update_lead_inbox_updated_at();

-- Backfill: voeg 'direction' = 'inbound' toe aan elke reply zonder direction.
-- Idempotent — entries met een bestaande 'direction' blijven onaangeraakt.
update leads
set replies = (
  select jsonb_agg(
    case
      when reply ? 'direction' then reply
      else jsonb_set(reply, '{direction}', '"inbound"')
    end
  )
  from jsonb_array_elements(replies) as reply
)
where jsonb_array_length(replies) > 0
  and exists (
    select 1 from jsonb_array_elements(replies) as r
    where not (r ? 'direction')
  );

-- RLS uit (consistent met andere lead-inbox-tabellen)
alter table outbound_replies disable row level security;
