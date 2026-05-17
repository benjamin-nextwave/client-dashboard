-- =============================================================================
-- OPERATOR MAANDDATA — MAILBOXEN-KOLOM TOEVOEGEN
-- =============================================================================
-- De operator voert vanaf nu het aantal mailboxen in, en het systeem
-- berekent automatisch contacts_to_approach = inboxes * 8. Beide
-- waarden blijven in de DB staan zodat:
--   - de check-vragenlijst contacts_to_approach kan blijven gebruiken
--     als {{aantal}}-template;
--   - de UI later teruglezen welk getal aan inboxen was ingevoerd
--     (zonder afhankelijk te zijn van deelbaarheid door 8).
--
-- Bestaande rijen krijgen inboxes = contacts_to_approach / 8 (integer
-- deling). Waarden die destijds niet als veelvoud van 8 zijn ingevoerd
-- zullen afgerond worden — in de praktijk waren alle bedoelde waarden
-- al veelvouden van 8, dus dit is acceptabel.
-- =============================================================================

ALTER TABLE public.operator_client_monthly_data
  ADD COLUMN IF NOT EXISTS inboxes INTEGER
  CHECK (inboxes IS NULL OR inboxes >= 0);

UPDATE public.operator_client_monthly_data
  SET inboxes = contacts_to_approach / 8
  WHERE contacts_to_approach IS NOT NULL
    AND inboxes IS NULL;
