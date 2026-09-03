-- =============================================================================
-- INSTANTLY-CIJFERS NIET MEER LIVE BIJ ELKE LAADBEURT
-- =============================================================================
-- Het overzicht haalde de dagcijfers bij elke laadbeurt rechtstreeks bij
-- Instantly op: per klant elke gekoppelde campagne, en per campagne twee
-- aanroepen. Over negenendertig klanten zijn dat er ruim honderd, allemaal
-- binnen één serverless-functie van zestig seconden.
--
-- Mislukt er één, dan valt die campagne stil terug op een lege lijst en lijkt de
-- klant niet te hebben verstuurd. Vandaar het beeld dat er zeven draaien terwijl
-- het er tien zijn, en dat het per verversing verschilt. De API zelf is niet de
-- boosdoener — drie metingen op rij gaven exact dezelfde uitkomst; het is de
-- hoeveelheid werk in één verzoek.
--
-- Deze tabel is de tussenlaag. Eén rij per klant met de laatst opgehaalde stand:
-- de campagnes en het aantal verzonden mails per dag. De pagina leest die rij en
-- doet zelf geen enkele aanroep meer, dus hij laadt altijd hetzelfde beeld. Het
-- ophalen gebeurt met de verversknop, waar het wél mag mislukken omdat je het
-- ziet gebeuren.
--
-- De momentopname staat als jsonb en niet uitgesplitst in kolommen: hij wordt
-- altijd in zijn geheel geschreven en in zijn geheel gelezen, en de vorm ervan
-- hoort bij de code die hem maakt.
--
-- synced_at is wat er op het scherm komt: cijfers zonder tijdstip zijn niet te
-- vertrouwen als ze uit een cache komen.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.loopgang_instantly_cache (client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE, snapshot JSONB NOT NULL DEFAULT '{}'::jsonb, error TEXT, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

CREATE INDEX IF NOT EXISTS idx_instantly_cache_synced ON public.loopgang_instantly_cache(synced_at DESC);

ALTER TABLE public.loopgang_instantly_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to instantly cache" ON public.loopgang_instantly_cache;

CREATE POLICY "Operators full access to instantly cache" ON public.loopgang_instantly_cache FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
