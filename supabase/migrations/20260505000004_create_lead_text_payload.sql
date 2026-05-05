-- ============================================================================
-- Migration: create_lead — accept p_raw_payload as text (Sprint 4 fix)
--
-- Probleem:
--   Make's HTTP-module serialiseert geneste JSON soms als JSON-string i.p.v.
--   echt JSON-object. PostgREST cast die string letterlijk naar jsonb (een
--   jsonb-string-waarde, niet een object). In de RPC zat dat dan in v_reply
--   en uiteindelijk in leads.replies, waar de hele array als jsonb-string i.p.v.
--   array kon belanden — afhankelijk van wat Make precies stuurde.
--
-- Fix:
--   Accepteer p_raw_payload als text en parse 'm in Postgres zelf. Werkt voor
--   beide gevallen (Make stuurt object → text representatie wordt geparsed;
--   Make stuurt JSON-string → ook gewoon geparsed). Als parsing faalt val
--   terug op '{}' en log niets — fail-safe i.p.v. fail-loud zodat de lead
--   nog wel correct wordt aangemaakt.
--
-- Breaking change voor Make: de RPC verwacht nu p_raw_payload als string.
-- Stuur "{}" of een geserialiseerde JSON-string. PostgREST RPC-cache reloadt
-- vanzelf bij signature change.
-- ============================================================================

-- Oude versie droppen (signature verschilt op p_raw_payload type)
drop function if exists create_lead(
  uuid, text, text, lead_classification, text, uuid, text,
  timestamptz, text, text, text, timestamptz, int, jsonb
);

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
  p_raw_payload        text default '{}'
)
returns leads
language plpgsql
as $$
declare
  v_reply     jsonb;
  v_lead      leads;
  v_raw_jsonb jsonb;
begin
  if p_instantly_email_id is null or p_instantly_email_id = '' then
    raise exception 'create_lead: p_instantly_email_id is required';
  end if;

  -- Parse p_raw_payload defensief: lege string → {}, ongeldige JSON → {}.
  begin
    v_raw_jsonb := coalesce(nullif(p_raw_payload, '')::jsonb, '{}'::jsonb);
  exception when others then
    v_raw_jsonb := '{}'::jsonb;
  end;

  -- Bouw de reply als echte jsonb (geen tekst-encoding, expliciete casts).
  v_reply := jsonb_build_object(
    'instantly_email_id', p_instantly_email_id,
    'campaign_id',        p_first_campaign_id::text,
    'sending_account',    p_sending_account,
    'from_email',         p_email,
    'subject',            coalesce(p_subject, ''),
    'body',               coalesce(p_body, ''),
    'received_at',        p_received_at,
    'ai_interest_value',  p_ai_interest_value,
    'classification',     p_classification::text,
    'direction',          'inbound',
    'raw_payload',        v_raw_jsonb
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

  -- Race-condition: een gelijktijdige insert won. Pak bestaande lead op en
  -- append deze reply alsnog (idempotent op instantly_email_id).
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

-- PostgREST schema-cache reload (zodat de nieuwe signature direct beschikbaar
-- is voor RPC-aanroepen).
notify pgrst, 'reload schema';
