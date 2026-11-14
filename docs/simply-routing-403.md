# 403 på produkt-URL'er uden skråstreg

Bekræftet 14. november 2026 med direkte offentlige HTTP-kald:

| URL | HTTP-status |
|---|---:|
| /ai-tilbudsgenerator | 403 |
| /ai-tilbudsgenerator/ | 200 |
| /ai-tilbudsgenerator/index.html | 200 |
| /tilbudsberegner | 403 |
| /tilbudsberegner/index.html | 200 |
| /tilbudsprogram-til-vvs | 200 |

HTML-filerne er udgivet. Fejlen skyldes manglende rewrite af de to nye
mapper uden afsluttende skråstreg. Deployment-scriptet udelukkede `.htaccess`
fra upload og opdaterede kun kunderuten. Nye offentlige routes i repositoryets
hostingkonfiguration nåede derfor ikke live-serveren.

## Rettelse

De offentlige regler er markeret i `hosting/simply/.htaccess`.
`scripts/deploy-simply.sh` synkroniserer nu netop denne blok, efter HTML-filerne
er på plads. Serverens øvrige regler, herunder Simplys HTTPS-opsætning,
bevares. En allerede synkroniseret blok erstattes uden at blive duplikeret.

Workflowets live-kontrol tester begge produkt-URL'er uden skråstreg.
Lokale tests med falsk SSH/rsync har bekræftet synkronisering,
bevarelse af HTTPS-regler, gentagelighed og stop ved overførselsfejl.

## Live-status

Routingrettelsen er anvendt på Simply den 14. november 2026. Den tidligere
konfiguration er sikkerhedskopieret uden for public_html i
`.codex-routing-backups/htaccess-before-product-routes-20261114`.
De eksisterende regler er bevaret; linjeskift er normaliseret til LF.

Verificeret efter rettelsen:

- Begge slash-frie produkt-URL'er: HTTP 200, korrekt titel og canonical.
- Begge skråstregsudgaver: HTTP 301 til den tilsvarende URL uden skråstreg.
- /tilbudsprogram-til-vvs og /kontakt: HTTP 200.
- /login og /customers: HTTP 200 med X-Robots-Tag: noindex, follow.
- En ukendt kontrol-URL: HTTP 404 med noindex.

Kun routingkonfigurationen blev opdateret live. Rettelsen af det automatiske
deployment-script og workflowets ekstra URL-kontroller ligger lokalt og skal
med i næste normale commit/push.
