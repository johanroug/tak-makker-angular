# Performance-måling – 14. november 2026

Lighthouse 13.6.0 med lokal headless Chrome, mobilprofil (412 × 823), simuleret netværk og 4× CPU-slowdown. Én kørsel pr. URL/variant. Målingerne er labdata og dokumenterer hverken faktisk INP eller beståede Core Web Vitals for rigtige brugere. PageSpeed Insights API afviste kaldet med HTTP 429 (kvote), så ingen CrUX-data blev hentet.

## Live-baseline

| Side | Performance | LCP | CLS | TBT |
|---|---:|---:|---:|---:|
| https://xn--hovedetpsmmet-wfb00a.dk/ | 70 | 7.5 s | 0 | 270 ms |
| https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-maler | 72 | 7.3 s | 0.033 | 230 ms |
| https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-murer | 90 | 2.5 s | 0 | 330 ms |
| https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-toemrer | 69 | 7.3 s | 0.001 | 320 ms |
| https://xn--hovedetpsmmet-wfb00a.dk/tilbudsprogram-til-vvs | 74 | 7.3 s | 0.001 | 170 ms |

Live-kørslerne for `/tilbudsberegner` og `/ai-tilbudsgenerator` blev afvist med HTTP 403. Ingen gyldige scores. Årsagen er ikke fastslået; kontrollér deployment, direkte URL-adgang og hostingregler efter udgivelse.

## Sammenligneligt lokalt produktionsbuild

Samme localhost-server med gzip, samme Chrome-/Lighthouse-indstillinger og friske browserprofiler. Serveren læste det eksisterende build før ændringer og det genbyggede output bagefter. Localhost-resultater kan ikke sammenlignes direkte med live-resultater.

| Variant | Performance | LCP | CLS | TBT |
|---|---:|---:|---:|---:|
| ai-tilbudsgenerator-local-after | 97 | 0.7 s | 0 | 190 ms |
| home-local-after | 84 | 4.5 s | 0 | 70 ms |
| home-local-before | 75 | 8.4 s | 0 | 100 ms |
| tilbudsberegner-local-after | 100 | 0.7 s | 0 | 40 ms |
| tilbudsprogram-til-vvs-local-after | 87 | 4.1 s | 0 | 60 ms |

## Implementerede ændringer

- Logo-SVG: kun det allerede synlige udsnit af det indlejrede billede medtages. 1.127.676 bytes bliver til 59.650 bytes (UTF-8). Alle 30.276 pixels i udsnittet er verificeret uændrede; farvefilter, viewBox og visningsdimensioner er bevaret. Originalfilen bevares. Header/footer og favicon bruger den nye fil.
- Forsiden får en prerenderet preload af det eksisterende hero-billede med høj prioritet. Ingen ændring i heroens udseende eller layout. Andre sider og private skaller får ikke denne preload.
- SEO-kontrollen beskytter mod manglende preload og utilsigtet preload på andre sider.
- Build, SEO-kontrol og Simply-pakkekontrol bestod. Eksisterende advarsler om bundle/CSS-budgetter og pdfmake/CommonJS består.
- De to Lighthouse-skærmbilleder af forsiden før/efter er gennemset: logo og layout fremstår ens. Den generelle visuelle kontrol var allerede godkendt af brugeren.

## Resterende arbejde

Forsidens lokale LCP er forbedret fra 8,4 til 4,5 sekunder i disse to enkeltkørsler, men er fortsat over målet 2,5 sekunder. VVS-sidens lokale LCP er også over målet. Gentag målinger efter udgivelse; vurder billedlevering og initial JavaScript ud fra trace, før større ændringer foretages. Feltdata for LCP, INP og CLS ved 75-percentilen skal kontrolleres i Search Console/CrUX, når de er tilgængelige. TBT er ikke INP.

Rå Lighthouse-rapporter og skærmbilleder er gemt lokalt i `tmp/seo-performance/` (git-ignoreret). Ændringerne er ikke udgivet som del af dette arbejde.
