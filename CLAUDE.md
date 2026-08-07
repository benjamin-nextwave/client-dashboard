# NextWave Klantendashboard

Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind CSS v4 + Supabase.
Eén codebase met **twee dashboards**: een klantdashboard en een operator/admin dashboard.

> **Let op:** er staat een `CLAUDE.md` in `C:\Users\bstei\Downloads\` die een heel
> ander project beschrijft ("Klei", een Clay-kloon met Drizzle/Inngest/AG Grid).
> Die geldt **niet** voor dit project. Negeer hem volledig.

---

## Huidige fase: strikt visuele aanpassingen

We voeren een redesign van het **klantdashboard** door. In deze fase geldt:

**Alleen markup en styling.** Geen wijzigingen aan data-fetching, state management,
routing, auth-logica, Supabase-queries of database-migraties. Kom je iets lelijks of
suboptimaals tegen: **niet aanpassen** — noteren en melden.

Wijkt een opdracht hiervan af (nieuwe query, nieuwe actie, nieuw veld), zeg dat
dan expliciet vóór je begint. De gebruiker mag ervoor kiezen, maar niet per ongeluk.

### Werkbranch

Werk uitsluitend op `redesign/client-dashboard`. Nooit `git checkout master`,
nooit mergen, nooit force-pushen. `master` is beschermd op GitHub (PR verplicht,
0 goedkeuringen, geldt ook voor beheerders) — een directe push wordt geweigerd.

Vangnet: tag `pre-redesign-baseline` = de exacte staat van productie vóór de redesign.

Voor elk commando dat de remote raakt (push, pull) eerst akkoord vragen.
Commit klein en vaak, berichten in het Nederlands, imperatief.

---

## Niet aankomen

| Wat | Waarom |
|---|---|
| `src/app/(operator)/**`, `src/components/admin/**`, `src/components/commissions/**` | admin dashboard blijft volledig ongemoeid |
| `src/app/(client)/dashboard/inbox-embed/**` | Instantly-iframe met vaste pixelpositionering; eerder al een keer gebroken |
| `src/components/ui/empty-state.tsx` | gedeeld met admin — gebruik `src/components/client/ui/empty-state.tsx` |
| `src/components/admin/news-preview-modal.tsx` | gedeeld met de admin nieuws-editor |
| `src/lib/instantly/**` | koppeling bevroren; uitbreiden alleen na expliciet akkoord |
| `supabase/migrations/**` | migraties draait de gebruiker zelf |

**Drie inboxen, niet één.** `/dashboard/inbox` (eigen inbox, staat niet in de nav,
nog niet herstyled), `/dashboard/inbox-embed` (Instantly-iframe, afblijven) en
`/dashboard/lead-inbox` (herstyled). Vraag altijd welke bedoeld wordt.

---

## Ontwerpsysteem

Tokens staan in `src/app/globals.css`, **gescopet in `.client-theme`** zodat het
admin dashboard er niets van erft. Die klasse staat op de wrapper in
`src/app/(client)/layout.tsx`, samen met `--brand-color`.

> Merk-tinten moeten op hetzelfde element staan als `--brand-color`. Custom
> properties met een `var()` erin worden vastgelegd waar ze gedeclareerd zijn —
> op `:root` zouden ze bevriezen op de standaardkleur en niet meebewegen met
> de klantkleur.

- Kleur via tokens: `bg-panel`, `bg-canvas`, `border-line`, `bg-track`,
  `text-fg`, `text-muted`, `text-faint`, `text-pos`, `text-neg`, `text-warn`,
  `bg-ink`, `text-brand-ink`
- Merk-tinten: `var(--brand-04)` t/m `var(--brand-95)`
- Categoriekleuren: `var(--c-cat-*)` — dezelfde stippen op alle pagina's
- Radius: `rounded-panel` (12px) en `rounded-control` (8px). Verder niets.
- **Geen box-shadows.** Diepte komt van haarlijnen en het contrast met de
  donkere sidebar.
- Lettertype: Instrument Sans, alleen op de client-wrapper. Admin houdt Geist.
- Cijfers krijgen `tabular-nums`.
- Tekstschaal: 25px kop, 15px subkop, 13.5px paneeltitel, 12.5px body, 11.5px meta.

Gebruik **geen** losse Tailwind-kleuren (`gray-500`, `blue-600`, `rose-50`).

### Zijbalk

240px uitgeklapt, 64px ingeklapt, breedte in `--sidebar-w` op
`document.documentElement`. De lead inbox hangt er met `position: fixed` naast
en leest die variabele uit — verander de breedte nooit zonder beide te
controleren. De zijbalk scrollt niet (`overflow-hidden`) en past vanaf ~631px
vensterhoogte.

---

## Ontwerppakketten uit zip-bestanden

De gebruiker levert ontwerpen aan als zip. **Het is een plaatje, geen bouwplan.**
Neem de code niet over; haal de stijl eruit en pas die toe op de bestaande
componenten. Controleer altijd op deze drie dingen, want ze zijn eerder alle
drie misgegaan:

1. **Werken de knoppen?** Eerdere pakketten hadden een verzendknop zonder
   `onSubmit`, en een composer zonder onderwerpveld terwijl de actie dat vereist.
2. **Blijft i18n overeind?** De ontwerpen hardcoderen Nederlands. Bestaat er een
   `useT`-versie, dan blijft die, en voeg ontbrekende sleutels toe in
   **nl, en én hi** (`src/lib/i18n/translations/`).
3. **Bestaat de data?** Ontwerpen tonen soms cijfers waar geen bron voor is.
   Verzin niets — laat het weg en meld het.

---

## Verificatie vóór "klaar"

```
npx tsc --noEmit          # moet 0 fouten geven
npm run lint              # 0 errors; 15 bestaande warnings zijn bekend
npx next build            # moet slagen
git status --short        # controleer dat admin en inbox-embed niet in de diff staan
```

De eigenaar heeft geen programmeerervaring. Geef na elke wijziging een concreet
testrecept: welke pagina, welke knop, wat er hoort te gebeuren. Claim nooit dat
iets werkt zonder het te hebben gecontroleerd.

---

## Deploy

**Niet deployen tijdens de redesign.** `npx vercel --prod` uploadt de lokale
werkmap en gaat langs GitHub heen — met de redesign-branch uitgecheckt zou dat
het werk live zetten. Moet er een productie-fix uit, dan eerst `git checkout master`.

Vercel Git-auto-deploy staat uit; er zijn geen preview-deploys.
Live domein: `https://www.dashboard-nextwave-solutions.nl` (mét streepje).

### Guard tegen uitgaande mail

`assertOutboundAllowed()` in `src/lib/safety/write-guard.ts` blokkeert
`replyToEmail()` tenzij `ALLOW_OUTBOUND_WRITES=true`. Die staat alleen in de
Vercel **Production**-scope. Lokaal zie je daarom een oranje testbalk onderin en
kan er geen mail de deur uit. Waarde moet exact `true` zijn, kleine letters.
