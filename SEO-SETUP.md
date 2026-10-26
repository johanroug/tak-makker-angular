# SEO for Hovedet på sømmet

## Klar lokalt — 25. oktober 2026

Forsiden og de tre fagsider genereres som færdig HTML ved build:

- `https://xn--hovedetpsmmet-wfb00a.dk/`
- `https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-toemrer`
- `https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-murer`
- `https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-maler`

Hver side har dansk indhold, egen titel, beskrivelse, canonical-adresse og Open Graph-metadata. Fagsiderne har forskellige tilbudseksempler, arbejdsbeskrivelser og spørgsmål. Forsiden og fagsiderne linker til hinanden.

`public/sitemap.xml` indeholder kun disse offentlige sider. `robots.txt` henviser til sitemap og tillader crawling, så Google også kan se `noindex` på appens øvrige sider. Login, registrering og private app-sider bruger en separat tom appskal med `noindex`, og deres Vercel-ruter får også en `X-Robots-Tag`-header. Dette erstatter ikke appens login og adgangskontrol.

Vercel leverer hver fagsides egen HTML. Ukendte adresser har ikke længere en generel omskrivning til forsiden; en genereret `404.html` viser appens side-ikke-fundet-visning. Den faktiske HTTP-status og routing skal kontrolleres på Vercel efter deployment.

## Build og lokal kontrol

Kør `npm run build`. Angular prerenderer fire offentlige sider. Derefter oprettes `404.html`, og HTML-kontrollen køres automatisk. Den kontrollerer blandt andet indhold uden JavaScript, metadata, interne links, sitemap og appskallens `noindex`.

Kontrollen kan genkøres med `npm run check:seo`. Den bruger ikke spec-filer eller sender kald til Supabase/OpenAI. Angular-versionerne er fastholdt på projektets eksisterende 22.2.0, inklusive de nye prerender-pakker.

## Efter deployment til Vercel

1. Brug `https://hovedetpåsømmet.dk` uden www som primært domæne. `https://xn--hovedetpsmmet-wfb00a.dk` er den tekniske skrivemåde for samme adresse, ikke et andet domæne. Se DOMAIN-SKIFTE.md for opsætning og viderestillinger.
2. Åbn alle fire offentlige adresser direkte og genindlæs dem. Vis sidens kildekode: overskrift og brødtekst skal være med før JavaScript kører.
3. Kontrollér `/sitemap.xml` og `/robots.txt`. De skal være henholdsvis XML og tekst, ikke Angular-forsiden.
4. Kontrollér login, registrering, nulstilling af adgangskode og et eksisterende projektlink. Private ruter skal fortsat kræve normal adgang og have `noindex` i header/metadata.
5. Åbn en adresse, der ikke findes. Den skal returnere HTTP 404 og må ikke vise forsiden som et gyldigt søgeresultat.
6. Kontrollér mobilvisning og tastaturnavigation. Mål indlæsningstid på den deployede side med PageSpeed Insights. Buildstørrelse er ikke en måling af faktisk brugeroplevet hastighed.

## Google Search Console — Johan

1. Åbn https://search.google.com/search-console og tilføj en **domæneejendom** for `hovedetpåsømmet.dk`.
2. Kopiér Googles konkrete TXT-verifikationsværdi. Tilføj den som en ny TXT-post for roddomænet i Simplys DNS-administration. Bevar Resends og Vercels eksisterende poster.
3. Gå tilbage til Search Console og verificér. TXT-værdien er kontospecifik og skal komme fra Google; den er ikke opfundet eller gemt i projektet.
4. Indsend `https://xn--hovedetpsmmet-wfb00a.dk/sitemap.xml` under Sitemaps.
5. Brug URL-inspektion på forsiden og de tre fagsider. Kontrollér den gengivne side og Googles valgte canonical. Anmod om indeksering, hvis muligheden vises.
6. Følg søgninger, eksponeringer, klik og indekseringsproblemer. Indeksering og placeringer er ikke garanteret eller kontrolleret lokalt.

Ingen Search Console-konto er forbundet eller verificeret af Codex. Der er ikke tilføjet analytics, cookies eller automatisk registrering af testtilmeldinger til markedsføringsmåling.

## Næste indholdsarbejde

- Undersøg relevante søgeord og konkurrence. De første tre fag er en start, ikke baseret på verificerede søgevolumener.
- Udbyg med originale guides og konkrete tilbudseksempler ud fra spørgsmål fra testfirmaer.
- Optag den rigtige demovideo med undertekster, og mål tidsbesparelse, før der loves bestemte tal.
- Afklar, hvordan testtilmeldinger skal tælles, før eventuel analyse eller markedsføringssporing implementeres.

## Officielle vejledninger

- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://angular.dev/best-practices/performance/ssr
- https://vercel.com/docs/project-configuration/vercel-json
