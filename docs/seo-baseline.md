# SEO-baseline og udgivelseskontrol

Dato: 14. november 2026. Etape 1–2; ingen nye landingssider eller analysetags.

## Verificeret før ændringer

- Alle otte offentlige URL'er i sitemap gav HTTP 200, indhold i rå HTML, én H1, selvrefererende canonical og `index, follow`.
- ASCII-domænet omdirigerede med HTTP 301 til `https://xn--hovedetpsmmet-wfb00a.dk/` (hovedetpåsømmet.dk). Bevar dette hoveddomæne.
- robots.txt og sitemap.xml gav HTTP 200.
- /customers, /projects/test, /offers/test, /login og /register gav en tom CSR-skal med `noindex` i HTML og X-Robots-Tag.
- /seo-audit-findes-ikke gav HTTP 404 og noindex.
- Kun WebSite-markup fandtes. Search Console-kontostatus og DNS-verifikation er ikke undersøgt.

## Implementeret lokalt

- Simply er eneste hostingplatform. Vercel-konfigurationen er fjernet; private ruter, offentlige sider og domæneomdirigeringer styres af Simplys .htaccess.
- Organization på offentlige sider, SoftwareApplication på forsiden og BreadcrumbList på undersider. Ingen priser eller anmeldelser konstrueres for at opfylde rich-result-krav.
- Mere præcis produktforklaring, beregnings-FAQ, forklaring af gratis forespørgsler og kontekstuelle links. Heroens markup og eksisterende CSS er bevaret.
- 768 px-varianter af tre dekorative billeder med srcset; originalerne bevares til større skærme.
- SEO-kontrol omfatter nu markup og alle kendte private ruter i Simply-konfigurationen.

## Lokal validering

`npm.cmd run build` bestod og prerenderede otte sider. Den automatiske SEO-kontrol bestod.

Initial bundle: 695,96 kB rå / estimeret 162,53 kB overført. Angular advarer om 500 kB-budgettet samt flere eksisterende komponenters CSS og pdfmake/CommonJS. PDF-biblioteket og dets skrifter er lazy chunks; deres filstørrelse er ikke bevis for belastning på forsiden.

De tre mindre JPG-filer fylder 83.783–91.458 bytes mod originalernes 198.563–214.860 bytes. Browserens valg afhænger af viewport og pixeltæthed; dette dokumenterer ikke en målt LCP-forbedring.

## Afventer adgang og målinger

1. Search Console-ejer verificerer domæneejerskab via DNS, indsender /sitemap.xml og undersøger indekseringsrapporten samt Googles canonical for forsiden og hver fagside. Ingen kontoadgang var tilgængelig under implementeringen.
2. Kør PageSpeed Insights for mobil på forsiden og de fire fagsider. Gem dato, URL, LCP, CLS, TBT og eventuelle CrUX-data. INP kan ikke konkluderes ud fra Lighthouse alene.
3. Kontrollér visuelt ved 360, 390, 768 og 1440 px: hero, nye overskrifter, links, FAQ, billeder og vandret overflow. Visuel browserkontrol er ikke udført i denne ændring.
4. Vurder Core Web Vitals ved 75-percentilen: LCP højst 2,5 s, INP højst 200 ms og CLS højst 0,1. Manglende feltdata må ikke registreres som bestået.
5. Efter udgivelse gentages live HTTP-, canonical-, noindex- og 404-kontroller. Lokale ændringer er ikke dokumentation for den udgivne version.

GA4, samtykkeløsning og registreringshændelser hører til en senere etape. Privatlivspolitikken er ikke ændret, og der er ikke indført tracking.

## Etape 3: To særskilte landingssider

- `/tilbudsberegner`: Arbejdsgang for beregning af timer og materialer, et illustrativt regneeksempel (5.500 kr. ekskl. moms / 6.875 kr. inkl. 25 % moms), kontrolpunkter og FAQ. Siden lover ikke en offentligt tilgængelig interaktiv beregner.
- `/ai-tilbudsgenerator`: Illustrativ terrassebeskrivelse, mulig opdeling i arbejdsopgaver, brugerens kontrol og afgrænsning af AI-forslag. Eksemplet er tydeligt markeret som illustration.
- Begge sider har egen titel, beskrivelse, H1, canonical, breadcrumb-markup, CTA og links til relevante fagsider og hinanden.
- Forsiden og fagsiderne linker til begge sider. Heroen på eksisterende sider er bevaret.
- Angular prerendering, sitemap og Simply-regler er udvidet. SEO-kontrollen forventer nu ti offentlige sider og kontrollerer de nye siders metadata, links og hostingkonfiguration.
- Ingen tracking eller nye produktfunktioner er tilføjet. Udgivelse og visuel browserkontrol udestår fortsat.
