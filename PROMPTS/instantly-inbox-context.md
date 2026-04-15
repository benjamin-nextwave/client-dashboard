# Instantly Inbox Embed — Volledig Overzicht

## Wat we proberen

We willen de Instantly unibox (e-mail inbox) embedden in ons klantendashboard als iframe, zodat het eruitziet als een native onderdeel van het dashboard. Klanten moeten kunnen inloggen in de Instantly inbox en hun e-mails kunnen lezen/versturen zonder het dashboard te verlaten.

## Onze infrastructuur

- **Dashboard**: Next.js app gehost op Vercel
  - Productie-URL: `https://dashboard.dashboard-nextwave-solutions.nl`
  - DNS van `dashboard-nextwave-solutions.nl` wordt beheerd via Vercel Nameservers
  - Vercel heeft een wildcard `*` ALIAS record dat alle subdomeinen naar Vercel routeert

- **Instantly whitelabel inbox**: Instantly.ai SPA (ook Next.js) gehost op Vercel (Instantly's Vercel account)
  - Werkend whitelabel domein: `https://inbox.dashboard-inbox-nextwave-solutions.nl`
  - DNS van `dashboard-inbox-nextwave-solutions.nl` wordt beheerd via Vercel (Instantly's setup)
  - Instantly's Vercel deployment draait achter `agency.itrackly.com`

- **Database**: Supabase met een `clients` tabel die per klant een `inbox_url` kolom heeft

## Het kernprobleem

Wanneer we de Instantly inbox URL (`inbox.dashboard-inbox-nextwave-solutions.nl`) in een iframe laden binnen ons dashboard (`dashboard.dashboard-nextwave-solutions.nl`), werkt het visueel — de loginpagina laadt. Maar na het inloggen krijgt de gebruiker de fout:

```
"No Authorization was found in request.cookies" (code: FST_JWT_NO_AUTHORIZATION_IN_COOKIE)
```

Dit komt doordat `dashboard-nextwave-solutions.nl` en `dashboard-inbox-nextwave-solutions.nl` **twee verschillende geregistreerde domeinen** (eTLD+1) zijn. Browsers behandelen cookies in het iframe als **third-party cookies** en blokkeren ze. De auth-cookie die Instantly zet na het inloggen wordt niet meegestuurd bij vervolgverzoeken.

## Instantly's technische details

De Instantly inbox is een **volledig client-side rendered Next.js SPA** met:
- **Axios** voor API-calls met relatieve baseURL (`/`, `/api/`, `/backend/api/v2`)
- **Dynamisch geladen webpack chunks** via `/_next/static/`
- **Localisatie-bestanden** geladen van `/locales/en/*.json`
- **Custom fonts** geladen van `/Averta/*.otf`
- **Scripts** geladen van `/scripts/*.js`
- **Auth via JWT cookie**: login zet een cookie, `/api/user/user_details` (met `withCredentials: true`) leest deze cookie
- **Domein-validatie**: de SPA valideert client-side of het huidige domein (`window.location.hostname`) een bekend/geconfigureerd domein is. Als het domein niet herkend wordt, toont de SPA een 404-pagina.
- **`__NEXT_DATA__`** bevat `nextExport: true` (statisch geëxporteerd), `assetPrefix` is leeg (assets laden relatief)

### Instantly's auth flow
```
/client/login → gebruiker voert credentials in → POST naar auth endpoint →
Instantly zet JWT cookie → redirect naar /app/unibox →
SPA laadt /api/user/user_details (met cookie) → inbox wordt getoond
```

### Instantly's API endpoint die faalt
```
GET /api/user/user_details
Headers: withCredentials: true (axios)
Zonder cookie: 401 {"code":"FST_JWT_NO_AUTHORIZATION_IN_COOKIE","message":"No Authorization was found in request.cookies"}
Met cookie: 200 (user details JSON)
```

## Wat we hebben geprobeerd

### Poging 1: Directe iframe embed
- iframe `src` wijst naar `https://inbox.dashboard-inbox-nextwave-solutions.nl/client/login`
- **Resultaat**: loginpagina laadt, maar na inloggen worden cookies geblokkeerd (third-party)
- **Reden**: verschillende eTLD+1 domeinen

### Poging 2: Next.js API route als reverse proxy
- Catch-all API route op `/api/instantly-proxy/[...path]` in ons dashboard project
- Proxyt requests naar Instantly, herschrijft cookies (Domain, SameSite, Secure, Path)
- **Resultaat**: HTML laadt correct, maar SPA toont 404
- **Reden 1**: `/_next/static` assets conflicteren met onze eigen Next.js `/_next/static`
- **Reden 2**: Instantly's SPA checkt `window.location.pathname` en vindt `/api/instantly-proxy/client/login` in plaats van `/client/login`
- **Pogingen om dit op te lossen**:
  - `history.replaceState` injecteren → helpt niet, SPA checkt hostname
  - `assetPrefix` injecteren in `__NEXT_DATA__` → assets laden, maar SPA 404 blijft
  - Fetch/XHR interceptors injecteren → vangt axios calls op maar niet alles
  - HTML rewriting van asset URLs naar absolute Instantly URLs → laadt correct maar SPA 404 blijft
- **Conclusie**: Instantly's SPA is te complex voor een application-level reverse proxy. De SPA gebruikt axios met relatieve baseURLs, dynamische webpack chunks, locales, fonts, en valideert het domein client-side.

### Poging 3: Next.js rewrites in next.config.ts
- Fallback rewrites: `/:path*` → `https://inbox.dashboard-inbox-nextwave-solutions.nl/:path*`
- **Resultaat**: pagina-HTML laadt correct, `/_next/static` assets conflicteren met onze eigen assets
- **Reden**: Next.js dev server (Turbopack) intercepteert `/_next/static` requests voordat rewrites worden toegepast
- Specifiek kregen we `PageNotFoundError` voor Instantly's chunks die onze dev server probeerde te compileren

### Poging 4: Subdomein op hetzelfde domein (CNAME)
- CNAME record: `inbox.dashboard-nextwave-solutions.nl` → `agency.itrackly.com`
- Idee: als dashboard en iframe op hetzelfde eTLD+1 zitten, zijn cookies same-site
- **Resultaat**: `DEPLOYMENT_NOT_FOUND` (Vercel 404)
- **Reden**: `agency.itrackly.com` is zelf gehost op Vercel. Vercel ontvangt het request maar heeft geen deployment geconfigureerd voor `inbox.dashboard-nextwave-solutions.nl`. Instantly moet dit domein aan hun Vercel project koppelen.

### Poging 5: Instantly het domein laten verifiëren
- TXT record voor Vercel domain verification toegevoegd
- CNAME record naar `agency.itrackly.com` toegevoegd
- Instantly heeft het domein geverifieerd en aan hun Vercel project gekoppeld
- **Resultaat**: de inbox pagina laadt correct, MAAR de cookies worden nog steeds geblokkeerd
- **Reden**: met het CNAME gaat verkeer direct naar Instantly's Vercel deployment. De browser praat rechtstreeks met Instantly's servers. In de iframe-context op ons dashboard domein worden cookies als third-party behandeld — ondanks dat het technisch hetzelfde eTLD+1 is. De reden is onduidelijk maar het probleem is reproduceerbaar.
- **Extra probleem**: Instantly claimt het domein op hun Vercel project, waardoor wij het niet meer op ons proxy-project kunnen claimen.

### Poging 6: Mini Vercel-project als proxy (huidige staat)
- Apart Vercel project (`instantly-inbox-proxy`) met alleen een `vercel.json`:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "https://inbox.dashboard-inbox-nextwave-solutions.nl/$1"
      }
    ]
  }
  ```
- Geclaimed op domein `mail.dashboard-nextwave-solutions.nl`
- Vercel's wildcard DNS routeert `mail.*` naar ons proxy-project
- **Resultaat**: server-side werkt de proxy perfect (curl geeft 200, correcte HTML, alle assets laden). Maar de Instantly SPA toont client-side een 404.
- **Reden**: Instantly's SPA valideert `window.location.hostname`. Het domein `mail.dashboard-nextwave-solutions.nl` is niet geconfigureerd bij Instantly, dus de SPA weigert te laden.

## De catch-22

We zitten vast in een catch-22:

| Scenario | Proxy? | Cookies? | SPA laadt? |
|----------|--------|----------|------------|
| Direct Instantly domein in iframe | Nee | ❌ Third-party geblokkeerd | ✅ Ja |
| Subdomein met CNAME naar Instantly | Nee | ❌ Nog steeds geblokkeerd | ✅ Ja |
| Subdomein met Vercel proxy (ons project) | Ja | ✅ Same-site (zou moeten werken) | ❌ SPA 404 (domein-validatie) |
| Instantly claimt het subdomein | Nee (zij handelen af) | ❌ Geblokkeerd (direct naar Instantly) | ✅ Ja |

**Het probleem**:
- Als Instantly het domein kent → verkeer gaat direct naar hen → cookies zijn third-party
- Als Instantly het domein niet kent → onze proxy werkt → maar SPA weigert te laden

## Huidige DNS-staat van dashboard-nextwave-solutions.nl

| Name | Type | Value | Doel |
|------|------|-------|------|
| `dashboard` | CNAME | `d2c92f2cdbd8f254.vercel-dns-016.com` | Dashboard Vercel project |
| `inbox` | CNAME | `agency.itrackly.com` | Instantly verificatie (stale) |
| `_vercel.inbox` | TXT | `vc-domain-verify=inbox.dashboard-nextwave-solutions.nl,...` | Instantly verificatie |
| `*` (wildcard) | ALIAS | `cname.vercel-dns-016.com` | Vangt alle andere subdomeinen op |

## Huidige staat van projecten

### Mini Vercel-project (instantly-inbox-proxy)
- **Status**: gedeployed, actief
- **Domein**: `mail.dashboard-nextwave-solutions.nl` (geclaimed)
- **Rewrite**: `/(.*) → https://inbox.dashboard-inbox-nextwave-solutions.nl/$1`
- **Werkt server-side**: ja (curl 200, correcte content)
- **Werkt client-side**: nee (Instantly SPA 404 door domein-validatie)

### Dashboard project (client-dashboard)
- **Branch**: `feature/instantly-inbox-embed`
- **Wat is gebouwd**:
  - E-mail tab in sidebar navigatie (conditioneel, alleen als `inbox_url` is ingesteld)
  - iframe component dat de `inbox_url` laadt
  - Database migratie voor `inbox_url` kolom op `clients` tabel
  - Admin formulier veld om inbox URL per klant in te stellen

## Wat we NIET controleren

- Instantly's server-side code en configuratie
- Instantly's Vercel project en deployment
- Instantly's cookie-attributen (Domain, SameSite, Secure, Path)
- Instantly's client-side domein-validatie logica
- Instantly's whitelabel domein-configuratie (behalve via hun UI)

## Mogelijke richtingen die nog niet zijn geprobeerd

1. **Cloudflare Worker als proxy**: in plaats van Vercel rewrites, een Cloudflare Worker die het request proxyt en de Host header herschrijft naar het Instantly whitelabel domein. De SPA zou dan `window.location.hostname` zien als `mail.dashboard-nextwave-solutions.nl` maar de server zou denken dat het request van `inbox.dashboard-inbox-nextwave-solutions.nl` komt. Het is onduidelijk of dit de client-side domein-validatie zou omzeilen.

2. **Instantly's domein-validatie reverse-engineeren**: de exacte JavaScript-code vinden die het domein valideert en kijken of er een manier is om dit te omzeilen (bijv. via een service worker die responses intercepteert).

3. **Instantly API direct gebruiken**: in plaats van hun SPA te embedden, hun API direct aanspreken en een eigen inbox UI bouwen. Dit vereist kennis van hun API-structuur en authenticatie.

4. **Instantly contacteren**: hen vragen om een manier te bieden om custom domeinen te gebruiken die wél werken in iframe-context met cookies. Of vragen of ze `SameSite=None; Secure` op hun cookies kunnen zetten.

5. **Browser-extensie of configuratie**: als het alleen voor intern gebruik is, third-party cookies toestaan voor het specifieke domein.

6. **Popup in plaats van iframe**: een nieuw venster openen voor de inbox in plaats van een iframe. Popup-vensters hebben geen third-party cookie restricties.

7. **Het dashboard verhuizen naar een subdomein van hetzelfde domein als de inbox**: bijv. `dashboard.dashboard-inbox-nextwave-solutions.nl`. Dan delen dashboard en inbox hetzelfde eTLD+1. Dit vereist een productie-URL wijziging.
