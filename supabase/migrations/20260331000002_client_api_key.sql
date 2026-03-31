-- Add per-client Instantly API key
ALTER TABLE public.clients
  ADD COLUMN instantly_api_key TEXT;
