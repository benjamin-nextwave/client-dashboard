-- Voorkeurstaal per gebruiker. Default 'nl'. Gebruikt door het client-dashboard
-- om alle UI-tekst te vertalen + om de taalkeuze door te sturen naar webhooks
-- en de chatbot system prompt.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'nl'
    CHECK (language IN ('nl', 'en', 'hi'));
