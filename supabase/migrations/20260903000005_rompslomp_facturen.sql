-- =============================================================================
-- ROMPSLOMP-FACTUREN IN DE LOOPGANG
-- =============================================================================
-- De facturen werden met de hand in de loopgang gezet terwijl ze al in Rompslomp
-- staan. Deze twee kolommen maken het mogelijk ze over te nemen.
--
-- WAAROM EEN CONTACT-ID EN NIET MATCHEN OP NAAM
-- Er staan 56 factuurcontacten in Rompslomp tegenover 39 klanten in de loopgang,
-- en maar 23 daarvan komen op naam overeen. De rest loopt op twee manieren mis:
-- klanten factureren onder hun statutaire naam ("schripsema management B.V." is
-- Schripsema Instituut, "BIC Institute B.V." is BIC Instituut), en er staan
-- contacten in die helemaal geen loopgang-klant zijn. Daar komt bij dat de
-- klantenlijst zowel "Successr" als "Successr BV" kent — op naam matchen zou
-- daar stilletjes de verkeerde factuur boeken. Eén keer koppelen is een paar
-- minuten werk en daarna klopt het altijd.
--
-- rompslomp_invoice_id op de factuurregel zorgt dat overnemen herhaalbaar is:
-- een factuur die al is overgenomen wordt bijgewerkt, niet nog een keer
-- aangemaakt. Handmatig ingevoerde regels hebben dit veld leeg en blijven met
-- rust.
--
-- BIGINT en geen INTEGER: de id's van Rompslomp zijn negencijferig en groeien.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS rompslomp_contact_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_rompslomp_contact ON public.clients(rompslomp_contact_id) WHERE rompslomp_contact_id IS NOT NULL;

ALTER TABLE public.client_invoice_marks ADD COLUMN IF NOT EXISTS rompslomp_invoice_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_marks_rompslomp ON public.client_invoice_marks(rompslomp_invoice_id) WHERE rompslomp_invoice_id IS NOT NULL;
