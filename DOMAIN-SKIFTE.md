# Hovedet på sømmet — navn, web og e-mail

## De nye adresser

| Formål | Adresse |
|---|---|
| Produktnavn | Hovedet på sømmet |
| Hovedadresse | https://hovedetpåsømmet.dk — uden www |
| Teknisk hovedadresse / IDN | https://xn--hovedetpsmmet-wfb00a.dk |
| E-maildomæne | hovedetpaasommet.dk |
| Forslag til systemafsender | noreply@hovedetpaasommet.dk |

Unicode-adressen og IDN-adressen er to skrivemåder for samme domæne. Canonical, sitemap og den tekniske opsætning bruger IDN-formen. E-mailadresser bruger domænet uden æ, ø og å.

## Udført lokalt — 26. oktober 2026

- Navn ændret i appen, login, offentlige sider, AI-status, PDF-metadata og AI-instruktioner.
- Hoveddomæne ændret i SEO-metadata, sitemap, robots.txt og opsætningsvejledninger.
- Vercel-redirects klargjort fra de to gamle webadresser og www-udgaven af det nye hoveddomæne til den nye hovedadresse. Undersidernes sti bevares.
- Længere navn tilpasset i mobilens ordmærke og appheader. Det eksisterende håndværkerikon indeholder ikke gammelt navn og er bevaret.
- Angular-projektnavn, pakkenavn, outputmappe og buildkontrol ændret til `hovedet-paa-soemmet-angular`.
- Opgavelisten hedder nu `TODO.md`.
- Separat migration `supabase/migrations/202610260001_brand_name.sql` ændrer den servergenererede blokeringstekst. Den er ikke kørt. Den oprindelige migrations fejltekst er også opdateret ved navneoprydningen; den separate migration retter allerede oprettede databaser uden at ændre adgangsreglerne.

GitHub-repoet og den lokale projektmappe har stadig deres eksisterende tekniske navne. Der er ikke oprettet nye Supabase-/Vercel-projekter, flyttet data eller ændret eksisterende kunders firmaoplysninger, gemte beskeder eller tilbud. Navneskiftet erstatter ikke historiske kundedata.

## Rækkefølge ved skiftet

### 1. Vercel og Simply: webdomænet

1. Åbn det eksisterende Vercel-projekt → Settings → Domains.
2. Tilføj `xn--hovedetpsmmet-wfb00a.dk` og eventuelt `www.xn--hovedetpsmmet-wfb00a.dk`. Hovedadressen skal være uden www. Kontrollér, at apex-domænet ikke har en modsat viderestilling til www, som vil give en redirect-løkke med projektets regler.
3. Åbn DNS for **hovedetpåsømmet.dk** hos Simply. Brug de præcise A-/CNAME-poster, Vercel viser for det nye domæne. Kopiér ikke gamle projektspecifikke værdier fra et tidligere skærmbillede.
4. Vent på verificeret domæne og HTTPS i Vercel. Behold gamle domæner tilsluttet, så deres redirects kan virke.
5. Kontrollér Vercels Build and Deployment-indstillinger. Hvis Output Directory har en manuel værdi, skal den være `dist/hovedet-paa-soemmet-angular/browser`.

### 2. Resend og Simply: afsenderdomænet

1. Tilføj **hovedetpaasommet.dk** som sending domain i Resend.
2. Tilføj de konkrete DKIM-/SPF-/eventuelle DMARC-poster fra Resend i DNS-zonen for **hovedetpaasommet.dk**, ikke hovedetpåsømmet.dk.
3. Bevar eventuelle MX-poster til almindelig indgående e-mail. Sending med Resend opretter ikke automatisk en almindelig e-mailkonto til manuel korrespondance.
4. Vent på verificeret sending domain. Hvis den eksisterende Resend API-nøgle er begrænset til det gamle domæne, skal en sending-nøgle til det nye domæne bruges i Supabase. Gem nøglen dér, aldrig i frontend eller Git.

### 3. Supabase Auth

I Authentication → URL Configuration:

- Site URL: `https://xn--hovedetpsmmet-wfb00a.dk`
- Redirect URL: `https://xn--hovedetpsmmet-wfb00a.dk/login`
- Redirect URL: `https://xn--hovedetpsmmet-wfb00a.dk/reset-password`
- Bevar de konkrete localhost-adresser til udvikling.
- Bevar midlertidigt de eksisterende produktionsredirects, mens domæneskift og aktive maillinks kontrolleres. Fjern dem først, når de ikke længere er nødvendige.

I Authentication → Email → SMTP Settings:

- Sender name: **Hovedet på sømmet**.
- Sender email: fx `noreply@hovedetpaasommet.dk`, efter domænet er verificeret i Resend.
- SMTP host: `smtp.resend.com`; port `465`; username `resend`.
- Password: Resend-nøglen, der kan sende fra det nye domæne.

Kontrollér eventuelle tilpassede emner og mailtekster for det gamle produktnavn. Appen bruger den aktuelle browsers origin til registrerings- og nulstillingslinks; localhost fungerer derfor stadig. Et nyt webdomæne deler ikke browserens eksisterende loginlager med det gamle, så brugere kan skulle logge ind igen.

### 4. Udrulning

1. Byg med `npm run build`, og commit/push ændringerne til det eksisterende GitHub-repo, når de skal udgives.
2. Udrul den opdaterede Supabase Edge Function `generate-offer`, så AI også får de nye instruktioner. Vercel deployer ikke denne funktion.
3. Kør navnemigrationen i Supabase SQL Editor efter gennemgang. Adgangsregler og godkendelsesflow er uændret.
4. Kontrollér på det nye webdomæne: forside, fagsider, logo, registrering, bekræftelsesmail, administratorgodkendelse, login, glemt adgangskode, AI og PDF.
5. Kontrollér permanente redirects fra de gamle domæner til tilsvarende undersider på det nye. Kontrollér også www → apex og HTTP → HTTPS uden løkker.

### 5. Google

- Tilføj og verificér det nye domæne i Google Search Console. Brug Googles TXT-værdi i DNS for hovedetpåsømmet.dk.
- Indsend `https://xn--hovedetpsmmet-wfb00a.dk/sitemap.xml`.
- Brug Search Consoles adresseændring for det gamle webdomæne, hvis den er relevant og tilgængelig. Behold redirects og gamle domæner under overgangen.
- Se også `SEO-SETUP.md`.

## Status

Johan har bekræftet følgende den 26. oktober 2026:

- Det nye webdomæne viser Valid Configuration i Vercel efter DNS-opsætning hos Simply.
- Det nye e-maildomæne er sat op i Resend. En ny API-nøgle og SMTP-afsender er indsat i Supabase.
- Supabase Site URL og redirect-adresser er opdateret.
- Registrering og bekræftelsesmail virker på det nye domæne med korrekt afsender.
- Nulstillingslinket virkede efter en første, midlertidig forbindelsesfejl via Safe Links. Årsagen til den første fejl er ikke fastslået.

Ændringerne ovenfor er udført af Johan. Deployment af AI-funktionen, navnemigration, Search Console og de gamle domæners redirects mangler fortsat særskilt bekræftelse.

## Oprydning efter overgangen

- **Behold de gamle webdomæner til redirects.** Kontrollér, at både apex og www viderestiller til det nye domæne med samme underside. Fjern ikke deres DNS eller domænetilknytning, mens gamle links stadig skal virke.
- **Resend:** tilbagekald den gamle API-nøgle, når det er bekræftet, at den ikke bruges af andre integrationer. Den nye nøgle i Supabase skal bevares. Fjern det gamle sending domain, hvis ingen tjenester længere sender fra det.
- **Supabase:** gennemgå mailtemplates og deres emnelinjer. Fjern gamle redirect-adresser, når gamle maillinks ikke længere skal understøttes. Bevar localhost til udvikling.
- **AI og database:** deploy generate-offer og kør navnemigrationen, hvis det ikke allerede er gjort. Ellers kan AI eller en serverfejl stadig vise det gamle navn.
- **GitHub og Vercel:** projekt- og reponavne kan omdøbes senere. De eksisterende tekniske navne er ikke synlige produkttekster og behøver ikke ændres for at siden virker.
- **Google:** verificér det nye domæne og indsend sitemap som beskrevet ovenfor.

Kodebasens gamle domænenavne i `vercel.json` er bevidste redirect-kilder. Referencer til det eksisterende GitHub-repo og allerede anvendte migrationer bevares. Den gamle, genererede lokale buildmappe er fjernet.

## Officielle vejledninger

- https://vercel.com/docs/domains/working-with-domains/add-a-domain
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
