-- =============================================================================
-- Kix-dashboard: een vraag beantwoorden en een mededeling als gelezen markeren
-- =============================================================================
-- Het Kix-dashboard draait zonder login op de anon-sleutel. Die mag niets in
-- operator_check_tasks lezen of schrijven (RLS), en dat blijft zo. In plaats
-- daarvan krijgt anon twee functies die precies één ding doen, alleen op
-- regels van Kix en alleen op de juiste soort.
--
-- Beide functies geven true terug als er een regel is bijgewerkt en false als
-- er niets paste (verkeerde id, niet van Kix, verkeerde soort, al afgerond,
-- of een leeg antwoord). Ze gooien geen fout, zodat het dashboard zelf kan
-- kiezen wat het toont.
--
-- Wat hier gebeurt is gelijk aan answerQuestion() en toggleTaskCompleted() in
-- het admin dashboard, zodat de takenpagina het niet anders ziet dan wanneer
-- iemand daar zelf antwoordt of afvinkt.
--
-- Afwegingen:
-- - LANGUAGE sql met de body tussen enkele quotes in plaats van plpgsql met
--   $$: de SQL-editor van Supabase struikelt over dollar-quoting. Enkele
--   quotes binnen de body zijn daarom verdubbeld.
-- - Elk statement op één regel, want de editor knipt meerregelige statements.
-- - SECURITY DEFINER met een vaste search_path, zodat de functie RLS passeert
--   maar niet via een eigen schema om de tuin te leiden is.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.kix_beantwoord_vraag(p_id uuid, p_answer text) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS 'WITH u AS (UPDATE public.operator_check_tasks SET answer = btrim(p_answer), answered_at = now(), is_completed = true, completed_at = now() WHERE id = p_id AND assignee = ''kix'' AND kind = ''vraag'' AND is_completed = false AND btrim(coalesce(p_answer, '''')) <> '''' RETURNING 1) SELECT count(*) > 0 FROM u';

CREATE OR REPLACE FUNCTION public.kix_mededeling_gelezen(p_id uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS 'WITH u AS (UPDATE public.operator_check_tasks SET is_completed = true, completed_at = now() WHERE id = p_id AND assignee = ''kix'' AND kind = ''mededeling'' AND is_completed = false RETURNING 1) SELECT count(*) > 0 FROM u';

REVOKE ALL ON FUNCTION public.kix_beantwoord_vraag(uuid, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.kix_mededeling_gelezen(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.kix_beantwoord_vraag(uuid, text) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.kix_mededeling_gelezen(uuid) TO anon, authenticated;
