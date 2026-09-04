-- =============================================================================
-- ÉÉN MEETINGTAAK PER KLANT
-- =============================================================================
-- Het regelen van de evaluatiemeeting viel in de takentabel uiteen in drie
-- soorten: mailen (poging 1), bellen (poging 2 t/m 5) en het meetingvenster.
-- Daardoor kon één klant er drie naast elkaar hebben staan in het tabblad Kix
-- taken, elk met een eigen teller, terwijl het steeds dezelfde vraag is: is die
-- meeting nou geregeld?
--
-- Nieuwe verzendingen landen voortaan allemaal op 'meeting-arrange'. Deze
-- migratie brengt de rijen die er al staan in dezelfde vorm.
--
-- Twee stappen, en de volgorde is nodig. Eerst worden per klant alle
-- openstaande meetingtaken op één na afgesloten — de nieuwste blijft, want die
-- draagt de hoogste teller. Pas daarna wordt die ene omgezet. Andersom zou de
-- unieke index op (client_id, kind) voor openstaande rijen erop stuklopen.
--
-- Afgeronde rijen blijven zoals ze zijn: dat is geschiedenis, en die hoort niet
-- met terugwerkende kracht van vorm te veranderen.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

UPDATE public.loopgang_kix_tasks SET status = 'done', completed_at = NOW(), updated_at = NOW(), kix_note = COALESCE(kix_note, 'Samengevoegd tot één meetingtaak.') WHERE status = 'open' AND kind IN ('meeting-mail', 'meeting-call', 'meeting-window') AND id NOT IN (SELECT DISTINCT ON (client_id) id FROM public.loopgang_kix_tasks WHERE status = 'open' AND kind IN ('meeting-mail', 'meeting-call', 'meeting-window') ORDER BY client_id, last_sent_at DESC);

UPDATE public.loopgang_kix_tasks SET kind = 'meeting-arrange', updated_at = NOW() WHERE status = 'open' AND kind IN ('meeting-mail', 'meeting-call', 'meeting-window');
