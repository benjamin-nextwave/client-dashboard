-- =============================================================================
-- MAANDRAPPORTEN — naast de bestaande weekrapporten
-- =============================================================================
-- De klant krijgt een eigen pagina "Rapporten" met week- en maandrapporten
-- gescheiden. Beide soorten zijn verder identiek: een PDF in dezelfde bucket,
-- een weergavenaam en een publieke URL.
--
-- Daarom een type-kolom op de bestaande tabel in plaats van een tweede tabel:
-- dat scheelt een dubbele bucket, dubbele RLS-policies en een dubbele
-- uploadstroom in het admin dashboard. De tabelnaam blijft
-- `client_weekly_reports` — hernoemen zou externe koppelingen kunnen breken
-- die wij hier niet kunnen zien.
--
-- Bestaande rijen zijn weekrapporten; de default zorgt daarvoor.
-- Volledig idempotent.
-- =============================================================================

ALTER TABLE public.client_weekly_reports
  ADD COLUMN IF NOT EXISTS report_type TEXT NOT NULL DEFAULT 'week';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_weekly_reports_report_type_check'
  ) THEN
    ALTER TABLE public.client_weekly_reports
      ADD CONSTRAINT client_weekly_reports_report_type_check
      CHECK (report_type IN ('week', 'month'));
  END IF;
END $$;

-- De klantpagina haalt beide soorten in één keer op en splitst ze daarna.
CREATE INDEX IF NOT EXISTS idx_client_weekly_reports_client_type
  ON public.client_weekly_reports(client_id, report_type, created_at DESC);
