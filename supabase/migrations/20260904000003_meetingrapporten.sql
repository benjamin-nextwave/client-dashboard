-- =============================================================================
-- DE DRIE RAPPORTEN BIJ EEN EVALUATIEMEETING
-- =============================================================================
-- Twee dagen voor een geplande meeting staan er drie taken: een leadrapportage,
-- een intern rapport om het gesprek mee in te gaan, en een maandrapport voor de
-- klant. Die werden gemaakt en per mail rondgestuurd, en waren daarna nergens
-- meer terug te vinden — zeker niet voor Kix, die het gesprek voert.
--
-- Deze tabel hangt de drie bestanden aan de meeting. Benjamin uploadt ze vanaf
-- de meetingdag in de kalender; met het Kix-filter aan ziet Kix op diezelfde dag
-- of ze er zijn en kan hij ze downloaden.
--
-- De sleutel is klant plus cyclusanker plus soort. Het anker en niet de
-- meetingdatum: een meeting die verzet wordt hoort dezelfde rapporten te houden,
-- en een nieuwe periode begint met een schone lei.
--
-- file_path staat naast file_url omdat verwijderen uit de bucket alleen op pad
-- kan, en een URL terugrekenen naar een pad is vragen om fouten. Dezelfde opzet
-- als bij de facturen en de leadrapportages.
--
-- De bestanden komen in de bestaande bucket `loopgang-docs`; er hoeft dus niets
-- in Storage te worden aangemaakt.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loopgang_meeting_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, cycle_anchor DATE NOT NULL, kind TEXT NOT NULL, file_url TEXT NOT NULL, file_path TEXT NOT NULL, uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (client_id, cycle_anchor, kind));

ALTER TABLE public.loopgang_meeting_reports DROP CONSTRAINT IF EXISTS loopgang_meeting_reports_kind_check;

ALTER TABLE public.loopgang_meeting_reports ADD CONSTRAINT loopgang_meeting_reports_kind_check CHECK (kind IN ('month', 'lead', 'internal'));

CREATE INDEX IF NOT EXISTS idx_meeting_reports_client_anchor ON public.loopgang_meeting_reports(client_id, cycle_anchor DESC);

ALTER TABLE public.loopgang_meeting_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to meeting reports" ON public.loopgang_meeting_reports;

CREATE POLICY "Operators full access to meeting reports" ON public.loopgang_meeting_reports FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
