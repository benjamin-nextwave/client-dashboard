-- ============================================================================
-- Migration: lead_inbox_visible flag op clients
--
-- Per-klant toggle voor de NIEUWE lead-inbox (de Supabase-only inbox uit
-- branche nieuwegeldbesparendeinbox). Default is false: alle bestaande
-- klanten zien de pagina niet, geen sidebar-link, geen gedragsverandering.
-- De operator zet deze handmatig op true wanneer een klant toegang krijgt.
--
-- Volledig naast clients.inbox_visible (de bestaande Instantly embed-inbox)
-- en clients.chat_inbox_visible. Geen van die toggles wordt aangeraakt.
-- ============================================================================

ALTER TABLE clients ADD COLUMN lead_inbox_visible BOOLEAN DEFAULT false;
