# Flytning til Simply

Appen er statisk bygget Angular, inklusive fire prerenderede offentlige sider.
Supabase og Stripe fortsætter som separate tjenester. Loginmails er senere
skiftet fra Resend til Simply SMTP; se smtp-simply.md. Ingen Node-server
skal startes på Simply. Det eksisterende Vercel-deployment bevares under testen.

## Status 7. november 2026

- Basic Suite Linux er købt på `hovedetpaasommet.dk`.
- `johan@hovedetpaasommet.dk` er testet med indgående og udgående mail.
- Kontakt og support videresendes til Johan og er testet.
- Resends DKIM-, send- og rsend-poster er bevaret i DNS.
- Webserveren er `linux327.unoeuro.com`, IP `93.191.156.238`, jf. kontrolpanelet.
- Direkte testadresse i kontrolpanelet:
  `hovedetpaasommet.dk.linux327.unoeuro-server.com`.
- Mappen er `public_html`. Før upload ligger kun en standardside og en tom
  `.htaccess` ifølge Johan. Ingen filer er endnu uploadet af Codex.
- DNS, webhotel og Vercel er ikke ændret under lokal klargøring.
- Første upload er udført af Johan. HTTP-preview viser 200 for forside/login,
  korrekte typer for sitemap/robots og 404 for ukendte sider/manglende JS.
  Preview-HTTPS gav certifikatnavnemismatch; ingen login/data testes via HTTP.
  Fagsider afslørede konflikt mellem DirectorySlash og slash-fri canonical;
  DirectorySlash Off og RewriteOptions AllowNoSlash er tilføjet og uploadet.
  Ny HTTP-kontrol består: alle tre fagsider giver 200 med særskilte titler,
  trailing slash viderestilles til den slash-frie side uden loop, og ukendte
  sider samt manglende JS giver fortsat 404.
- IDN-domænealias er oprettet, og offentlig DNS for både hoveddomænet og www
  peger nu på 93.191.156.238. Gyldigt HTTPS og HTTP→HTTPS er kontrolleret for
  hoveddomænet. Johan har bekræftet login/projekt, AI-svar og PDF med logo på
  den flyttede side. Maildomænets web-A-poster er nu oprettet for rod og www;
  gyldigt HTTPS for begge er kontrolleret direkte på Simply-IP'en. Johan har
  indsat 301-viderestilling af webbesøg til det primære IDN-domæne efter
  ACME-undtagelsen. Mail fungerer fortsat uafhængigt af webviderestillingen.

## Byg og upload

1. Kør `npm run build:simply`. Det kører produktionsbuild og de eksisterende
   SEO-kontroller og tilføjer `hosting/simply/.htaccess` til browser-buildet.
2. Upload hele INDHOLDET fra `dist/hovedet-paa-soemmet-angular/browser` til
   `public_html`. Bevar undermapperne og medtag `.htaccess`. Upload ikke hele
   repoet, SQL, nøgler, node_modules eller den overordnede browser-mappe.
3. Ved første upload kan Simplys standardside `index.html` og tomme `.htaccess`
   erstattes. Andre eksisterende filer skal undersøges før overskrivning.
4. Upload filer med hash i navnet før HTML ved fremtidige opdateringer. Bevar
   gamle hash-filer i en overgangsperiode, så åbne faners lazy imports fortsat
   virker. ZIP-udpakning er ikke i sig selv atomisk; kontrollér altid efter upload.

## Regler på webhotellet

`.htaccess` leverer fagsidernes prerenderede HTML, app-ruternes CSR-skal og reel
HTTP 404 for ukendte URL'er og manglende filer. HTML genvalideres; hash-filer
caches længe. www på det primære IDN-domæne viderestilles til uden www.
Den direkte Simply-testadresse viderestilles ikke og får noindex-header.
Der er endnu ingen viderestilling fra maildomænet til det primære webdomæne;
den tilføjes efter opsætning af domænealias og HTTPS.

## Test FØR DNS-skift

- Åbn direkte Simply-URL med HTTPS fra kontrolpanelet. Kontrollér certifikatet;
  brug ikke login eller send kundedata gennem en usikker HTTP-forbindelse.
- Kontrollér `/`, de tre fagsider, sitemap.xml og robots.txt.
- Kontrollér HTTP 200, korrekt HTML og noindex på testadressen.
- Genindlæs `/login`, `/register`, `/company-profile`, `/projects/<id>` og
  `/offers/<id>` direkte. De skal levere appskallen, ikke en server-404.
- `/findes-ikke` og `/chunk-findes-ikke.js` skal give HTTP 404.
- Kontrollér cache-headere, at statiske filer har korrekt MIME-type, og at
  der ikke er 500-fejl fra Apache-indstillinger.
- Supabase Auth-redirects og Stripe-returadresser tillader ikke automatisk
  preview-domænet. Test derfor fuldt login/mail/PDF/AI på det kanoniske domæne
  med lokal hosts-overstyring, eller efter det kontrollerede DNS-skift.
  Tilføj ikke preview-domæner til betalings-allowlisten blot for hostingtesten.
- De lokale kontroller validerer buildet; de beviser ikke den konkrete
  Apache-konfiguration hos Simply. Den skal kontrolleres på webhotellet.

## Domæner og DNS

Primær hjemmeside forbliver `https://xn--hovedetpsmmet-wfb00a.dk/`
(`hovedetpåsømmet.dk`). Mail bruger `hovedetpaasommet.dk`.

1. Tilknyt IDN-domænet som domænealias til Basic Suite på samme konto, med
   samme mappe som hjemmesiden. Afklar alias og HTTPS i Simplys kontrolpanel.
2. Gem de nuværende DNS-værdier før skift, så webtrafik kan rulles tilbage.
3. Ret kun web-A/AAAA/CNAME efter kontrolpanelets konkrete anvisning. Fjern
   eventuelle gamle web-AAAA-poster, hvis de peger et andet sted end Simply.
   Bevar MX, SPF, DKIM, DMARC, Resend og øvrige verifikationsposter.
4. Opsæt gyldigt HTTPS for primært domæne, www og maildomænets webadresse.
5. Viderestil maildomænets webadresse til det primære domæne, så den tidligere
   DNS-fejl erstattes af en fungerende adresse uden duplikeret indhold.
6. Kontrollér mail, login, nulstilling, AI, PDF, SEO og relevante webhooks.
   Backend-webhooks ændrer ikke adresse ved denne frontendflytning.
7. Fjern først Vercel-tilknytningen, når Simply fungerer og DNS er slået igennem.

## Automatisk GitHub-udgivelse

Johan har valgt `main` som eneste udgivelsesbranch. `payment` udgives ikke.
Workflowet `.github/workflows/deploy-simply.yml` bygger og kører SEO-kontroller,
gemmer buildet som artifact og uploader derefter gennem SSH til `public_html`.
Kun deployment-jobbet har adgang til servernøglen. Handlinger er låst til
commit-id'er fra deres officielle repositories. En manuel kørsel kan også
startes fra Actions, men kun på main. Deployments køres én ad gangen.

Workflow og scripts er klargjort lokalt. Før aktivering:

1. Tilføj den offentlige, særskilte deployment-nøgle fra
   `.simply-deploy/github-actions.pub` i Simply → Website → SSH-adgang.
   Den private nøgle ligger lokalt i `.simply-deploy/github-actions`. Mappen
   er ignoreret af Git og må aldrig uploades som webfiler.
2. Find SSH-/FTP-brugernavnet i Simplys loginoplysninger. Host er
   `ssh.simply.com`, jf. Simplys vejledning. Bekræft login, mappe og rsync,
   før den første deployment køres.
3. Opret GitHub Environment `simply-production`. Begræns Deployment branches
   til main, hvis repositoryets plan understøtter det. Opret environment-secrets:
   - `SIMPLY_SSH_USER`: SSH-/FTP-brugernavn.
   - `SIMPLY_SSH_PRIVATE_KEY`: hele den private deployment-nøgle.
   - `SIMPLY_SSH_KNOWN_HOSTS`: verificeret SSH-servernøgle til ssh.simply.com.
   Servernøglen skal sammenholdes med Simplys publicerede SSHFP-oplysninger
   eller et fingeraftryk bekræftet gennem Simply. StrictHostKeyChecking er slået til.
4. Merge klargøringen til main, når den skal udgives. Workflowet starter først,
   når filen er på GitHub og de nødvendige secrets er oprettet. Første rigtig
   Actions-kørsel og offentlig kontrol af den udgivne version mangler stadig.

Uploaden sender ressourcer før HTML og bevarer gamle hash-filer. Den bruger
ikke --delete. Hele siden skiftes ikke atomisk, men rsync aktiverer færdige
overførsler ved rename. En fejl ved ressourcer stopper før HTML-trinnet.

Den eksisterende `.htaccess` på Simply bevares ved automatisk deployment,
fordi den indeholder den testede Simply-HTTPS-konfiguration. Ændringer til
`hosting/simply/.htaccess` skal derfor gennemgås og lægges op særskilt.
En førstegangsupload til en helt ny mappe skal foretages manuelt; scriptet
afviser en mappe uden eksisterende index.html og .htaccess.

Lokal test: `bash scripts/check-simply-deploy.sh`. Den bruger falske ssh/rsync
og kontrollerer rækkefølge, ingen sletning, streng servernøglekontrol og stop
ved fejl. Den erstatter ikke en test med rigtig SSH-adgang på Simply.

Ingen adgangskoder eller private nøgler skal indsættes i chat, kode eller
offentlige webfiler. Offentlig nøgle må indsættes i Simply; privat nøgle kun
i det relevante GitHub Secret. Workflowet ændrer ikke Supabase, Stripe eller DNS.
