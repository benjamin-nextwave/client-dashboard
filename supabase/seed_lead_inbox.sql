-- ============================================================================
-- Seed: lead_inbox (Sprint 1)
--
-- Voert 1 test-customer + 1 test-campagne + 2 dummy leads in.
-- Idempotent: on conflict do nothing op alle inserts, zodat dit script
-- veilig meerdere keren gedraaid kan worden.
--
-- Run vanuit project root:
--   psql "$SUPABASE_DB_URL" -f supabase/seed_lead_inbox.sql
-- of in Supabase Studio → SQL Editor → plak inhoud → run.
-- ============================================================================

-- Vaste UUID's zodat de dashboard pagina (hardcoded customer_id) matcht.
-- Customer: Test Klant
-- Campaign: gekoppeld aan Instantly campaign_id ae59963d-d3ec-4543-8eca-b4ef5f784a63

-- Customer
insert into customers (id, name, notification_email, status)
values (
  'a1f4c2e8-7b3d-4f6a-9d2c-8e1b5a9c3f47',
  'Test Klant',
  'benjamin@nextwave-solutions.nl',
  'active'
)
on conflict (id) do nothing;

-- Campaign
insert into campaigns (id, customer_id, instantly_campaign_id, name, is_active)
values (
  'b2e5d3f9-8c4e-4a7b-be3d-9f2c6b0d4e58',
  'a1f4c2e8-7b3d-4f6a-9d2c-8e1b5a9c3f47',
  'ae59963d-d3ec-4543-8eca-b4ef5f784a63',
  'Test Campagne',
  true
)
on conflict (instantly_campaign_id) do nothing;

-- Lead 1: 1 reply
insert into leads (
  id, customer_id, email, name,
  classification, thread_id,
  first_campaign_id, sending_account,
  first_reply_at, last_reply_at,
  replies
)
values (
  'c3f6e4fa-9d5f-4b8c-cf4e-af3d7c1e5f69',
  'a1f4c2e8-7b3d-4f6a-9d2c-8e1b5a9c3f47',
  'jan.devries@example-bedrijf.nl',
  'Jan de Vries',
  'meeting_request',
  'thread-test-0001',
  'b2e5d3f9-8c4e-4a7b-be3d-9f2c6b0d4e58',
  'outreach@nextwave-solutions.nl',
  '2026-05-03T09:14:22Z',
  '2026-05-03T09:14:22Z',
  jsonb_build_array(
    jsonb_build_object(
      'instantly_email_id', '019df28b-5423-7187-8460-764e429acebb',
      'campaign_id',       'b2e5d3f9-8c4e-4a7b-be3d-9f2c6b0d4e58',
      'sending_account',   'outreach@nextwave-solutions.nl',
      'from_email',        'jan.devries@example-bedrijf.nl',
      'subject',           'Re: Hoe wij jullie kostprijs per lead kunnen halveren',
      'body',              E'Hoi,\n\nDank voor je bericht. Klinkt interessant — kun je volgende week dinsdag rond 14:00 een korte demo inplannen?\n\nGroet,\nJan',
      'received_at',       '2026-05-03T09:14:22Z',
      'ai_interest_value', 3,
      'classification',    'meeting_request',
      'direction',         'inbound',
      'raw_payload',       jsonb_build_object('source', 'seed', 'note', 'dummy data — sprint 1')
    )
  )
)
on conflict (customer_id, email) do nothing;

-- Lead 2: 2 replies (thread)
insert into leads (
  id, customer_id, email, name,
  classification, thread_id,
  first_campaign_id, sending_account,
  first_reply_at, last_reply_at,
  replies
)
values (
  'd4f7f5fb-ae6f-4c9d-df5f-bf4e8d2f6f7a',
  'a1f4c2e8-7b3d-4f6a-9d2c-8e1b5a9c3f47',
  'sandra.bakker@klant-twee.nl',
  'Sandra Bakker',
  'meeting_request',
  'thread-test-0002',
  'b2e5d3f9-8c4e-4a7b-be3d-9f2c6b0d4e58',
  'outreach@nextwave-solutions.nl',
  '2026-05-02T11:02:08Z',
  '2026-05-04T08:47:31Z',
  jsonb_build_array(
    jsonb_build_object(
      'instantly_email_id', '019df28c-1234-7187-8460-764e429ad001',
      'campaign_id',       'b2e5d3f9-8c4e-4a7b-be3d-9f2c6b0d4e58',
      'sending_account',   'outreach@nextwave-solutions.nl',
      'from_email',        'sandra.bakker@klant-twee.nl',
      'subject',           'Re: Korte vraag over jullie aanpak',
      'body',              E'Hi,\n\nInteressant voorstel. Heb je een case study die ik kan zien? Wil het eerst met mijn team afstemmen.\n\nVriendelijke groet,\nSandra Bakker\nMarketing Lead — Klant Twee',
      'received_at',       '2026-05-02T11:02:08Z',
      'ai_interest_value', 2,
      'classification',    'meeting_request',
      'direction',         'inbound',
      'raw_payload',       jsonb_build_object('source', 'seed', 'note', 'dummy data — sprint 1')
    ),
    jsonb_build_object(
      'instantly_email_id', '019df28c-5678-7187-8460-764e429ad002',
      'campaign_id',       'b2e5d3f9-8c4e-4a7b-be3d-9f2c6b0d4e58',
      'sending_account',   'outreach@nextwave-solutions.nl',
      'from_email',        'sandra.bakker@klant-twee.nl',
      'subject',           'Re: Korte vraag over jullie aanpak',
      'body',              E'Top, ik heb het besproken. We zien graag een korte demo. Heb je donderdag tijd?\n\nGroet,\nSandra',
      'received_at',       '2026-05-04T08:47:31Z',
      'ai_interest_value', 4,
      'classification',    'meeting_request',
      'direction',         'inbound',
      'raw_payload',       jsonb_build_object('source', 'seed', 'note', 'dummy data — sprint 1, follow-up')
    )
  )
)
on conflict (customer_id, email) do nothing;
