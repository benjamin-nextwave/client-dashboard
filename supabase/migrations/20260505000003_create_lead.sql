-- ============================================================================
-- Migration: create_lead RPC (Sprint 4 follow-up — Make integration)
--
-- Pendant van append_inbound_reply: voor het aanmaken van een nieuwe lead.
-- Make stuurt platte parameters; Postgres bouwt zelf de replies JSONB-array.
-- Voorkomt dat Make's HTTP-module nested JSON als string serialiseert
-- (escape-bug die replies als text in jsonb stopt).
--
-- Race-handling:
--   - Unique-constraint (customer_id, email) vangt parallelle inserts.
--   - Bij conflict do nothing: we halen de bestaande lead op en appenden
--     de reply alsnog (idempotent op instantly_email_id), zodat een
--     gelijktijdige tweede call dezelfde reply niet kwijtraakt.
-- ============================================================================

create or replace function create_lead(
  p_customer_id        uuid,
  p_email              text,
  p_name               text,
  p_classification     lead_classification,
  p_thread_id          text,
  p_first_campaign_id  uuid,
  p_sending_account    text,
  p_first_reply_at     timestamptz,
  p_instantly_email_id text,
  p_subject            text,
  p_body               text,
  p_received_at        timestamptz,
  p_ai_interest_value  int,
  p_raw_payload        jsonb default '{}'::jsonb
)
returns leads
language plpgsql
as $$
declare
  v_reply jsonb;
  v_lead  leads;
begin
  if p_instantly_email_id is null or p_instantly_email_id = '' then
    raise exception 'create_lead: p_instantly_email_id is required';
  end if;

  -- Postgres bouwt de JSONB zelf — Make stuurt alleen platte velden.
  v_reply := jsonb_build_object(
    'instantly_email_id', p_instantly_email_id,
    'campaign_id',        p_first_campaign_id,
    'sending_account',    p_sending_account,
    'from_email',         p_email,
    'subject',            p_subject,
    'body',               p_body,
    'received_at',        p_received_at,
    'ai_interest_value',  p_ai_interest_value,
    'classification',     p_classification,
    'direction',          'inbound',
    'raw_payload',        p_raw_payload
  );

  insert into leads (
    customer_id, email, name, classification, thread_id,
    first_campaign_id, sending_account,
    first_reply_at, last_reply_at,
    replies
  ) values (
    p_customer_id, p_email, nullif(p_name, ''), p_classification, p_thread_id,
    p_first_campaign_id, p_sending_account,
    p_first_reply_at, p_first_reply_at,
    jsonb_build_array(v_reply)
  )
  on conflict (customer_id, email) do nothing
  returning * into v_lead;

  -- Race-condition: een gelijktijdige insert won. Pak de bestaande lead op
  -- en append deze reply alsnog (skip als instantly_email_id er al in zit).
  if v_lead.id is null then
    select * into v_lead
    from leads
    where customer_id = p_customer_id and email = p_email;

    if v_lead.id is not null
       and not (
         v_lead.replies @> jsonb_build_array(
           jsonb_build_object('instantly_email_id', p_instantly_email_id)
         )
       )
    then
      update leads
      set
        replies       = replies || v_reply,
        last_reply_at = greatest(last_reply_at, p_received_at),
        updated_at    = now()
      where id = v_lead.id
      returning * into v_lead;
    end if;
  end if;

  return v_lead;
end;
$$;
