-- ============================================================================
-- Migration: update_classification_enum (Sprint 2 — nieuwegeldbesparendeinbox)
--
-- Vervangt de oude lead_classification enum (positive/negative/neutral/spam/
-- unknown) door 7 business-categorieën. Mapping voor bestaande data:
--   positive -> meeting_request
--   negative -> not_interested
--   neutral  -> not_now_maybe_later
--   spam     -> not_interested
--   unknown  -> not_now_maybe_later
--
-- Postgres enums zijn niet "in place" wijzigbaar — daarom: rename, nieuwe maken,
-- kolom casten, drop oud. JSONB-replies bevatten classificatie als string en
-- worden hier ook bijgewerkt zodat oud en nieuw nooit door elkaar staan.
-- ============================================================================

-- 1. Hernoem oude enum
alter type lead_classification rename to lead_classification_old;

-- 2. Nieuwe enum
create type lead_classification as enum (
  'meeting_request',
  'phone_request',
  'interested',
  'referral',
  'internal_review',
  'not_now_maybe_later',
  'not_interested'
);

-- 3. Kolom omzetten naar nieuwe enum, met expliciete mapping voor bestaande data
alter table leads
  alter column classification type lead_classification
  using (
    case classification::text
      when 'positive'  then 'meeting_request'
      when 'negative'  then 'not_interested'
      when 'neutral'   then 'not_now_maybe_later'
      when 'spam'      then 'not_interested'
      when 'unknown'   then 'not_now_maybe_later'
    end
  )::lead_classification;

-- 4. Replies JSONB array bijwerken: per reply de 'classification' string remappen
update leads
set replies = coalesce(
  (
    select jsonb_agg(
      case (reply->>'classification')
        when 'positive' then jsonb_set(reply, '{classification}', '"meeting_request"')
        when 'negative' then jsonb_set(reply, '{classification}', '"not_interested"')
        when 'neutral'  then jsonb_set(reply, '{classification}', '"not_now_maybe_later"')
        when 'spam'     then jsonb_set(reply, '{classification}', '"not_interested"')
        when 'unknown'  then jsonb_set(reply, '{classification}', '"not_now_maybe_later"')
        else reply
      end
    )
    from jsonb_array_elements(replies) as reply
  ),
  '[]'::jsonb
)
where jsonb_array_length(replies) > 0;

-- 5. Oud enum-type opruimen
drop type lead_classification_old;
