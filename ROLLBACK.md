# Terugdraaien naar fase 1

**Fase 1** = het dashboard zoals het draaide vóór de redesign van het klantdashboard.

Zeg *"draai het dashboard terug naar fase 1"* en dan wordt onderstaande uitgevoerd.

> **Stand 11 augustus 2026:** de redesign is live gezet als
> `dpl_3yQYKVab8ANi4w7p9FiaFTp97nUK`
> (`client-dashboard-4f07iymsj-next-wave-ais-projects-9af589b5.vercel.app`).
> Fase 1 is daarmee de vórige deployment en blijft het terugvalpunt.

---

## Wat fase 1 precies is

| | |
|---|---|
| **Live deployment** | `dpl_9Ad8XbHkjP5bU6PYq6DH7JNW4xMd` |
| **URL** | `https://client-dashboard-2tk3mq6ml-next-wave-ais-projects-9af589b5.vercel.app` |
| **Aangemaakt** | 4 augustus 2026, 21:20 |
| **Codepunt** | git-tag `fase-1` → commit `eff58d9` op `master` |

De deployment is de bron van waarheid: die draait op dit moment op
`www.dashboard-nextwave-solutions.nl`. De git-tag is de bijbehorende code.

---

## Manier 1 — de snelle weg (aanbevolen)

Zet de vorige deployment terug. Duurt seconden, is byte-voor-byte exact wat er
nu live draait, en er wordt niets opnieuw gebouwd.

```
npx vercel rollback https://client-dashboard-2tk3mq6ml-next-wave-ais-projects-9af589b5.vercel.app
```

Controleren:

```
npx vercel rollback status
```

Kan ook zonder terminal: Vercel → project `client-dashboard` → **Deployments** →
de deployment van 4 augustus → **⋯** → **Promote to Production**.

## Manier 2 — opnieuw bouwen vanaf de tag

Alleen nodig als de deployment uit manier 1 niet meer bestaat (Vercel bewaart ze
niet eeuwig).

```
git checkout fase-1
npx vercel --prod
git checkout redesign/client-dashboard
```

Let op: `vercel --prod` uploadt de **lokale werkmap**. Controleer met
`git status` dat die schoon is voordat je dit doet.

---

## Wat een rollback NIET terugdraait

**De database.** Code en data staan los van elkaar. Een rollback zet de code
terug, niet de rijen in Supabase. Concreet:

- Leads, klanten, weekrapporten, bezwaren en CRM-records blijven zoals ze op dat
  moment zijn. Een rollback maakt niets ongedaan wat een gebruiker heeft
  verwijderd of gewijzigd.
- De migratie `20260808000001_client_monthly_reports.sql` (de kolom
  `report_type`) blijft bestaan. Dat is veilig: de kolom is toegevoegd met een
  standaardwaarde en de fase 1-code kijkt er niet naar.

Wil je ook data terug, dan gaat dat via Supabase → **Database** → **Backups**
(Point-in-Time Recovery), niet via deze procedure.

---

## Volgorde bij het live zetten van de redesign

1. Controleer dat de migratie `20260808000001_client_monthly_reports.sql` is
   gedraaid. *Stand 11 augustus 2026: gedraaid — de kolom `report_type` bestaat.*
2. Controleer dat `ALLOW_OUTBOUND_WRITES` in de Vercel **Production**-scope op
   exact `true` staat. *Stand 11 augustus 2026: bevestigd.* Staat die verkeerd,
   dan kan geen enkele klant meer antwoorden versturen vanuit de inbox.
3. Deploy.
4. Test meteen: inloggen, lead inbox openen, een antwoord versturen.
