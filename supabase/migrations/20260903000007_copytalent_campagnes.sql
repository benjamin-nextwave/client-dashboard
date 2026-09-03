-- =============================================================================
-- COPYTALENT WEER AAN DE JUISTE CAMPAGNES
-- =============================================================================
-- Het dashboard liet nul verzonden mails zien voor Copytalent. De koppeling zelf
-- was in orde — eigen workspace, eigen API-sleutel, geldige campagne-id's — maar
-- hij wees naar de zeven campagnes van de vorige generatie. Die staan sinds
-- 15 juni gepauzeerd of zijn afgerond, dus nul kloppend maar nutteloos.
--
-- In diezelfde workspace draait sinds die tijd een nieuwe generatie campagnes,
-- herkenbaar aan "- Claude | <provider>" in de naam. Die zijn nooit aan het
-- dashboard gekoppeld. Vier ervan versturen vandaag nog (3 september):
--
--   Geen vacature - Claude | Overig      1863 verstuurd
--   Geen vacature - Claude | Microsoft    870 verstuurd
--   live vacature - Claude | Overig       179 verstuurd
--   live vacature - Claude | Microsoft    136 verstuurd
--
-- De twee Google-varianten staan nu op nul (gepauzeerd en concept) maar horen
-- bij dezelfde reeks; die gaan mee zodat ze meetellen zodra ze aangaan. Dat is
-- precies wat hier misging: een nieuwe campagne die niemand koppelt.
--
-- De zeven oude gaan op inactief in plaats van weg. is_active bepaalt alleen
-- welke campagnes worden opgehaald voor de cijfers — de lead-inbox hangt er niet
-- aan — dus dit is terug te draaien met één schakelaar op de klantpagina, en de
-- historie blijft staan.
--
-- Herhaalbaar: de invoegingen slaan zichzelf over als het id er al staat.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

UPDATE public.campaigns SET is_active = FALSE WHERE customer_id = '0e0140a2-4bf5-4b22-8443-06adf4450060' AND instantly_campaign_id IN ('2043182d-a477-4c2e-bcf4-a68d6f6ff97c', '8c19fda0-87ac-449a-9a08-ce0585c4937f', 'ed91f938-c692-49d5-b31e-2724224a6456', '709cd835-f256-429d-a06d-9210a17764a3', '049fda9a-331e-4e02-a818-27fe32c9fe33', 'f8bae6fe-8f98-4363-b909-6bcd385d3f14', '13257d2a-95a8-4d13-bf97-b65e250388f5');

INSERT INTO public.campaigns (customer_id, name, instantly_campaign_id, is_active) SELECT '0e0140a2-4bf5-4b22-8443-06adf4450060', 'Geen vacature - Claude | Overig', 'bd5eeac6-3bc9-41d6-acce-e21ff1792c72', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE instantly_campaign_id = 'bd5eeac6-3bc9-41d6-acce-e21ff1792c72');

INSERT INTO public.campaigns (customer_id, name, instantly_campaign_id, is_active) SELECT '0e0140a2-4bf5-4b22-8443-06adf4450060', 'Geen vacature - Claude | Microsoft', '17fa95f4-8f28-4567-9363-2557c7d8d77a', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE instantly_campaign_id = '17fa95f4-8f28-4567-9363-2557c7d8d77a');

INSERT INTO public.campaigns (customer_id, name, instantly_campaign_id, is_active) SELECT '0e0140a2-4bf5-4b22-8443-06adf4450060', 'Geen vacature - Claude | Google', 'd00f52d9-1b7b-4997-b6f4-ed298067f662', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE instantly_campaign_id = 'd00f52d9-1b7b-4997-b6f4-ed298067f662');

INSERT INTO public.campaigns (customer_id, name, instantly_campaign_id, is_active) SELECT '0e0140a2-4bf5-4b22-8443-06adf4450060', 'live vacature - Claude | Overig', 'f4a57905-61e9-4a64-ba98-47e4713076f0', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE instantly_campaign_id = 'f4a57905-61e9-4a64-ba98-47e4713076f0');

INSERT INTO public.campaigns (customer_id, name, instantly_campaign_id, is_active) SELECT '0e0140a2-4bf5-4b22-8443-06adf4450060', 'live vacature - Claude | Microsoft', '91b5f67b-ea91-413d-809b-e1422fc0f107', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE instantly_campaign_id = '91b5f67b-ea91-413d-809b-e1422fc0f107');

INSERT INTO public.campaigns (customer_id, name, instantly_campaign_id, is_active) SELECT '0e0140a2-4bf5-4b22-8443-06adf4450060', 'live vacature - Claude | Google', '42756611-a92b-43f9-a97e-b12493335b2a', TRUE WHERE NOT EXISTS (SELECT 1 FROM public.campaigns WHERE instantly_campaign_id = '42756611-a92b-43f9-a97e-b12493335b2a');
