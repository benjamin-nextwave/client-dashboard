-- =============================================================================
-- KIX-TAKEN — wat er naar Kix is gestuurd blijft staan
-- =============================================================================
-- De takenlijst ging tot nu toe rechtstreeks naar een Make-webhook en verdween
-- daarna. Daardoor kon dezelfde taak drie dagen achter elkaar de deur uit gaan
-- zonder dat iemand dat zag: het overzicht laat immers elke dag opnieuw zien dat
-- de factuur van Armora nog niet betaald is.
--
-- Deze tabel is het geheugen daarvan. Eén rij per taak, niet per verzending:
-- stuur je dezelfde taak nog eens, dan telt reminder_count op en schuift
-- last_sent_at mee. Zo staat er in het overzicht "3x herinnerd, laatst op
-- 1 september" naast de taak zelf.
--
-- Een taak is uniek per klant en soort zolang hij openstaat. Afgeronde taken
-- blijven bewaard — de volgende cyclus levert dezelfde soort taak opnieuw op, en
-- die hoort een eigen teller te krijgen en niet die van vorige maand.
--
-- kix_note en meeting_date zijn wat er terugkomt: Kix zet erbij wat hij heeft
-- gedaan, of op welke datum de meeting staat. Dat verzet de cyclus niet — het
-- vastleggen van een meeting blijft via "Kix toevoegen" lopen, waar ook de
-- vervolgtaken uit voortkomen.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loopgang_kix_tasks (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, kind TEXT NOT NULL, label TEXT NOT NULL, detail TEXT, due_date DATE, first_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), reminder_count INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'open', kix_note TEXT, meeting_date DATE, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE public.loopgang_kix_tasks DROP CONSTRAINT IF EXISTS loopgang_kix_tasks_status_check;

ALTER TABLE public.loopgang_kix_tasks ADD CONSTRAINT loopgang_kix_tasks_status_check CHECK (status IN ('open', 'done'));

ALTER TABLE public.loopgang_kix_tasks DROP CONSTRAINT IF EXISTS loopgang_kix_tasks_reminder_check;

ALTER TABLE public.loopgang_kix_tasks ADD CONSTRAINT loopgang_kix_tasks_reminder_check CHECK (reminder_count > 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kix_tasks_open_uniek ON public.loopgang_kix_tasks(client_id, kind) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_kix_tasks_client_laatst ON public.loopgang_kix_tasks(client_id, last_sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_kix_tasks_status_laatst ON public.loopgang_kix_tasks(status, last_sent_at DESC);

ALTER TABLE public.loopgang_kix_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to kix tasks" ON public.loopgang_kix_tasks;

CREATE POLICY "Operators full access to kix tasks" ON public.loopgang_kix_tasks FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
