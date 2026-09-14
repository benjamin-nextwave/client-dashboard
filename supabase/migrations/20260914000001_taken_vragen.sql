-- =============================================================================
-- Takenpagina: naast taken ook vragen, met een antwoord van de ontvanger
-- =============================================================================
-- Zelfde uitgangspunt als de vorige uitbreiding (20260831000001): externe
-- dashboards lezen operator_check_tasks rechtstreeks, dus hier staat
-- uitsluitend uitbreiding. Geen kolom wordt hernoemd, verwijderd of van type
-- veranderd, en description blijft de regel zelf -- bij een vraag is dat de
-- vraag, bij een taak de taak.
--
-- LET OP voor de externe kant: er kunnen vanaf nu rijen in deze tabel staan
-- met kind = 'vraag'. Die komen daar binnen als gewone taak, want description
-- is gevuld en is_completed werkt hetzelfde. Wie ze apart wil behandelen
-- filtert op kind; wie niets aanpast ziet ze als taak. Bestaande rijen houden
-- kind = NULL en dat betekent 'taak'.
--
-- Bewust zonder DO-blokken en met elk statement op een regel: de SQL-editor
-- van Supabase struikelt over dollar-quoting en knipt meerregelige statements
-- op de verkeerde plek af.
-- =============================================================================


-- Stap 1. kind: onderscheid tussen een taak en een vraag.
-- Nullable zonder backfill, zodat bestaande lezers en schrijvers niets merken.
-- NULL leest de takenpagina als 'taak'.

ALTER TABLE public.operator_check_tasks ADD COLUMN IF NOT EXISTS kind TEXT;

ALTER TABLE public.operator_check_tasks DROP CONSTRAINT IF EXISTS operator_check_tasks_kind_check;

ALTER TABLE public.operator_check_tasks ADD CONSTRAINT operator_check_tasks_kind_check CHECK (kind IS NULL OR kind IN ('taak', 'vraag'));


-- Stap 2. answer: het antwoord van de ontvanger, letterlijk zoals getypt.
-- Bewust geen model eroverheen: een antwoord is van de ontvanger zelf en moet
-- niet herschreven worden.

ALTER TABLE public.operator_check_tasks ADD COLUMN IF NOT EXISTS answer TEXT;


-- Stap 3. answered_at: wanneer er geantwoord is.
-- Apart van completed_at, want een vraag kan ook zonder antwoord worden
-- afgevinkt (achterhaald, mondeling besproken). Dan blijft answered_at leeg.

ALTER TABLE public.operator_check_tasks ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
