-- ============================================================================
-- Migration: append_inbound_reply (Sprint 4 follow-up — Make integration)
--
-- Voegt een Postgres-functie toe die Make.com aanroept om een inkomende reply
-- atomair aan een bestaande lead toe te voegen.
--
-- Probleem dat dit oplost:
--   Make's standaard Supabase-modules doen "Search row → append in code →
--   Update row". Twee parallelle polls op dezelfde lead kunnen elkaars
--   replies-array overschrijven → silent data loss.
--
-- Wat de functie doet:
--   1. Forceert direction='inbound' in de reply payload (ongeacht wat Make
--      meestuurt) — beschermt tegen verkeerde routing.
--   2. Doet de append in één UPDATE — Postgres row-locking serialiseert
--      gelijktijdige aanroepen op dezelfde lead.
--   3. Idempotent: skipt de append als instantly_email_id al in de replies
--      array staat. Retries van Make zijn veilig.
--   4. Bumpt last_reply_at naar de nieuwste timestamp (greatest van bestaand
--      en nieuw, zodat out-of-order polling ook klopt).
--
-- Gebruik vanuit Make:
--   POST /rest/v1/rpc/append_inbound_reply
--   Body: { "p_lead_id": "<uuid>", "p_reply": { ... reply object ... } }
--   Returns: true als appended, false als al bestaand of lead niet gevonden.
--
-- Voor *nieuwe* leads doet Make een gewone INSERT op leads. De unique
-- constraint (customer_id, email) vangt collisions af; bij conflict kan Make
-- alsnog deze functie aanroepen om de reply aan de bestaande lead toe te
-- voegen.
-- ============================================================================

create or replace function append_inbound_reply(
  p_lead_id uuid,
  p_reply   jsonb
)
returns boolean
language plpgsql
as $$
declare
  v_reply        jsonb;
  v_email_id     text;
  v_received_at  timestamptz;
  v_rows_updated int;
begin
  v_email_id := p_reply ->> 'instantly_email_id';
  if v_email_id is null or v_email_id = '' then
    raise exception 'append_inbound_reply: instantly_email_id is required in p_reply';
  end if;

  -- Forceer direction = 'inbound' (overschrijft als Make het anders meestuurt).
  v_reply := jsonb_set(p_reply, '{direction}', '"inbound"');

  -- Gebruik received_at uit payload, valt terug op now() als ontbreekt.
  v_received_at := coalesce(
    nullif(v_reply ->> 'received_at', '')::timestamptz,
    now()
  );

  -- Atomic + idempotent: alleen appenden als deze instantly_email_id
  -- nog niet in de replies array zit. Postgres row-lock op de UPDATE
  -- serialiseert parallelle aanroepen op dezelfde lead.
  update leads
  set
    replies       = replies || v_reply,
    last_reply_at = greatest(last_reply_at, v_received_at),
    updated_at    = now()
  where id = p_lead_id
    and not (
      replies @> jsonb_build_array(
        jsonb_build_object('instantly_email_id', v_email_id)
      )
    );

  get diagnostics v_rows_updated = row_count;
  return v_rows_updated > 0;
end;
$$;
