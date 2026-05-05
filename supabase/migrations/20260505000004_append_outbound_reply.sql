-- ============================================================================
-- Migration: append_outbound_reply (Sprint 4 follow-up — Make integration)
--
-- Pendant van append_inbound_reply voor onze eigen verzonden replies. Make
-- roept deze aan ná een succesvolle Instantly-reply, zodat de outbound entry
-- in leads.replies belandt en folder-routing (awaitingOurReply = false) weer
-- klopt voor het dashboard.
--
-- Verschillen met append_inbound_reply:
--   - direction wordt geforceerd op 'outbound' (negeert wat Make meestuurt).
--   - ai_interest_value wordt verwijderd: outbound heeft geen Instantly-AI
--     classifier — dat veld zou misleidend zijn.
--   - classification wordt verwijderd: een outbound reply mag de
--     lead-classificatie nooit overschrijven of beïnvloeden.
--
-- Atomair + idempotent (zelfde patroon als append_inbound_reply):
--   - Eén UPDATE; Postgres row-locking serialiseert parallelle calls.
--   - Skipt de append als instantly_email_id al in de array zit (retry-safe).
--   - Bumpt last_reply_at via greatest() — out-of-order writes blijven
--     correct.
-- ============================================================================

create or replace function append_outbound_reply(
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
    raise exception 'append_outbound_reply: instantly_email_id is required in p_reply';
  end if;

  -- Strip velden die niet bij outbound horen, daarna direction overschrijven.
  v_reply := p_reply - 'ai_interest_value'::text - 'classification'::text;
  v_reply := jsonb_set(v_reply, '{direction}', '"outbound"');

  -- Gebruik received_at uit payload, anders now().
  v_received_at := coalesce(
    nullif(v_reply ->> 'received_at', '')::timestamptz,
    now()
  );

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
