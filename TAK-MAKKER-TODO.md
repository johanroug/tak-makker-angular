# Tak Makker TODO — 20. oktober 2026

## 1. Nødvendigt før første kunde

- [x] **Tilbudsbetingelser** — Gyldighed, betalingsbetingelser og eventuelle forbehold.
- [x] **Virksomhedsprofil** — Sikre at firmanavn, CVR, adresse, telefon og e-mail er udfyldt og bruges korrekt.
- [x] **Logo på PDF** — Mulighed for at uploade virksomhedens logo.
- [x] **Tilbudsstatus** — Kladde, færdiggjort, sendt, accepteret og afvist. Funktionelt bekræftet; særskilt kontrol af adgang og nyt tilbud står nedenfor.
- [x] **Korrekt håndtering af ændringer** — Manuelle rettelser må ikke blive overskrevet af AI. Johan har bekræftet appkontrollerne.
- [x] **Test af hele tilbudsflowet** — Johan har bekræftet det samlede flow fra første AI-besked til færdig PDF, også efter genindlæsning.

## 2. Vigtigt til en solid MVP

- [ ] **Sikkerhed og adgang** — Gennemgå Supabase RLS og sikre, at virksomheder kun ser egne data.
- [ ] **Fejlhåndtering** — Tydelige fejlbeskeder, loading og beskyttelse mod dobbeltklik.
- [ ] **Mobil og tablet** — Tilpasse layout, faner, formularer og tilbudsvisning.
- [ ] **Validering** — Tjek af obligatoriske felter, tal, priser og ugyldige input.
- [ ] **PDF-finpudsning** — Sideskift, lange beskrivelser, mange opgaver og materialer.
- [ ] **Deployment** — Miljøvariabler, produktionsdatabase, domæne og fejllogning.
- [ ] **Vercel: skift fra React til Angular** — Vercel bruger i dag det gamle React-projekt i et andet repo. Tilknyt dette Angular-projekts repo, konfigurér Angular-build, outputmappe, miljøvariabler og routing, og kontrollér deployment samt genindlæsning af undersider.

## 3. Efter MVP

- [ ] **Send tilbud** — Send PDF direkte til kunden via e-mail.
- [ ] **Tilbudsrevisioner** — Opret ny version af et tidligere færdiggjort tilbud.
- [ ] **Kundekartotek** — Gem kunder og genbrug deres oplysninger.
- [ ] **Abonnement og betaling** — Betalingsløsning, abonnementer og forbrugsgrænser.
- [ ] **AI-forbedringer** — Bedre faglige forslag og hjælp til estimering af tid og materialer.
- [ ] **Dashboard** — Overblik over tilbud, samlet værdi og acceptprocent.

## Afsluttet disciplin: Tilbudsbetingelser
Status: Funktionelt afsluttet — Johan har bekræftet alle beskrevne tests.

- [x] Find virksomhedsprofil, project.service.ts og offer.service.ts.
- [x] Virksomhedsstandarder: gyldighed, betalingsbetingelser og forbehold.
- [x] Projekt: redigér, gem og annullér betingelser; valider hele positive gyldighedsdage.
- [x] Database-migration med standarder ved projektoprettelse og atomisk tilbudskopi.
- [x] Vis betingelser i udkast, færdigt tilbud og PDF.
- [x] Bevar eksisterende RPC’er, prisberegning, AI-felter og historiske tilbud.
- [x] Angular-produktionsbuild gennemført uden fejl (advarsler om størrelser og PDF-afhængigheder).
- [x] Ændringer gennemgået igen 16. oktober 2026; produktionsbuild genkørt uden fejl.
- [x] Målrettede kontroller: ugyldige dage, gemning/rydning, tom ændring og PDF-indhold med nye/ældre tilbud.
- [x] Johan har testet gem/genindlæs af virksomhedsstandarder og arv af standarder på nye projekter.
- [x] Johan har bekræftet gemte betalingsbetingelser og forbehold i både projects og offers.
- [x] Johan har testet, at ændringer på projektet ikke ændrer betingelserne på det færdige tilbud.
- [x] Johan har testet, at ændrede virksomhedsstandarder ikke ændrer eksisterende projekter og tilbud.
- [x] Johan har testet annullering og genindlæsning; tidligere gemte betingelser bevares.
- [x] Johan har testet tomme felter, ugyldige dage samt betingelser og lange forbehold i PDF.

## Udrulning
- [ ] Bekræft migrationens fulde status i Supabase-migrationshistorikken før udrulning til andre miljøer. Funktionaliteten er testet i Johans miljø; Codex har ikke kørt migrationen. Eventuelle databaseændringer kræver Johans godkendelse.

## Afsluttet disciplin: Virksomhedsprofil

Status: Afsluttet — Johan har bekræftet de beskrevne app- og PDF-kontroller.

- [x] Adressefelt i profil, service og lokale databasetyper.
- [x] Migration med adresse på virksomheden og kopi på nye tilbud; historiske tilbud ændres ikke.
- [x] Adresse fra tilbudskopien vises på færdigt tilbud og PDF.
- [x] Validering af navn, adresse, CVR (8 cifre), telefon, e-mail og ikke-negativ timepris.
- [x] Migrationen beskytter færdiggørelse af nye tilbud mod manglende virksomhedsoplysninger.
- [x] Produktionsbuild bestået; fire automatiske tests bestået.
- [x] Johan har kørt `supabase/migrations/202610160002_company_address.sql` i Supabase SQL Editor og bekræftet resultatet: “Success. No rows returned”.
- [x] Johan har testet gem/genindlæs profil og fejl ved ugyldige felter.
- [x] Johan har testet virksomhedsoplysninger i nyt tilbud/PDF, og at ændret profil ikke ændrer adressen på det færdige tilbud.

## Afsluttet disciplin: Logo på PDF

Status: Afsluttet — Johan har bekræftet de beskrevne kontroller.

- [x] Upload af PNG/JPG (højst 2 MB), skalering, forhåndsvisning og fjernelse i virksomhedsprofilen.
- [x] Logo fra tilbudskopien i færdigt tilbud og PDF med bevarede proportioner.
- [x] Lokal SQL-migration med logo på virksomhed og tilbud; ingen ændring af historiske tilbud.
- [x] Angular-produktionsbuild bestået uden fejl; eksisterende størrelses- og CommonJS-advarsler består. Ingen nye spec-filer.
- [x] Johan har kørt `supabase/migrations/202610160003_company_logo.sql` i Supabase SQL Editor og bekræftet resultatet: “Success. No rows returned”.
- [x] Johan har bekræftet upload, gem/genindlæs, fjernelse samt afvisning af ugyldige filer.
- [x] Johan har bekræftet logo i nyt tilbud og PDF med korrekte proportioner samt tilbud uden logo.
- [x] Johan har bekræftet, at udskiftning/fjernelse af virksomhedens logo ikke ændrer logoet på færdige tilbud.

## Næste disciplin

- Afventer Johans nye TODO-punkt. Alle punkter i afsnit 1 er funktionelt afsluttet; MVP- og udrulningskontroller er fortsat åbne.

## Afsluttet disciplin: Hele tilbudsflowet

Status: Funktionelt afsluttet — Johan har bekræftet den samlede appkontrol 20. oktober 2026.

- [x] Produktionsbuild bestået efter PDF-rettelsen 20. oktober 2026; kendte størrelses- og CommonJS-advarsler består.
- [x] Gennemgået AI-besked → gemning → kladde → valg af linjer → færdiggørelse → genåbning → PDF.
- [x] Rettet PDF-flowet til at afvente asynkron download, så loading, beskyttelse mod dobbeltklik og fejlbesked følger PDF-genereringen.
- [x] Midlertidige kontroller af faktiske Angular-klasser med simulerede afhængigheder bestået: beregninger, ikke-accepterede linjer, manglende kundenavn, dobbelt færdiggørelse, genåbning, tilbudskopi, PDF-indhold, ventetid, fejl og nyt forsøg. Kontrolscriptet er fjernet; ingen nye spec-filer.
- [x] Johan har bekræftet `TILBUDSFLOW-KONTROL.md` på et helt nyt projekt: første AI-besked, genindlæsning af kladde, priser, startstatus på nyt tilbud, genåbning og PDF samt uændret historisk tilbud efter ændring af kladden.

## Afsluttet disciplin: Manuelle rettelser

Status: Funktionelt afsluttet — Johan har bekræftet alle de beskrevne appkontroller. Den supplerende AI-kontekstforbedring afventer næste udrulning og er ikke nødvendig for gemmebeskyttelsen.

- [x] AI opdaterer kun eksisterende timer, mængder og enheder, når de ikke er markeret som manuelt rettede. Eksisterende tekster, priser og accepterede/afviste valg genskrives ikke af AI.
- [x] Betingede opdateringer sammenligner de læste værdier i selve databaseskrivningen. En samtidig manuel ændring gør, at AI springer opdateringen over. Nye AI-rækker indsættes uden at overskrive samtidige indsættelser.
- [x] AI kan ikke selv markere egne estimater som brugerrettelser. Tomme manuelle værdier og nulværdier bevares.
- [x] Produktionsbuild bestået 20. oktober 2026 med kendte størrelses- og CommonJS-advarsler.
- [x] Midlertidig målrettet kontrol af den faktiske ProjectService med simuleret database: manuelle tomme værdier/null/0, normale AI-opdateringer, samtidige brugerrettelser på projekt/opgaver/materialer, samtidige indsættelser og nye forslag bestået. Kontrollen er fjernet; ingen nye spec-filer.
- [x] Johan har bekræftet rettelser af kunde, projekttitel, beskrivelser, opgavetimer og materialefelter efter ny AI-besked og genindlæsning; manuelle værdier og accepterede/afviste valg bevares.
- [x] Johan har bekræftet tomme valgfrie værdier, værdien 0, og at AI stadig kan tilføje nye forslag.
- [ ] Ekstra forbedring af AI-kontekst i `generate-offer` er forberedt lokalt: send de faktiske kildemarkeringer for kunde/projekt og instruér modellen om at bevare manuelle felter. Træder i kraft efter næste udrulning af Edge-funktionen; appens gemmebeskyttelse kræver ikke denne udrulning. Codex har ikke udrullet eller ændret databasen.

## Afsluttet disciplin: Tilbudsstatus

Status: Funktionelt afsluttet — Johan har bekræftet statusskift, gemning, genåbning, oversigt og uændret PDF. Resterende kontrol af nyt tilbud og adgang på tværs af virksomheder er registreret særskilt nedenfor.

- [x] Johan har bekræftet, at status gemmes og vises korrekt i oversigten efter SQL-rettelsen.
- [x] Rettet dropdownens startværdi: den gemte status markeres på selve valgmuligheden, når tilbuddet åbnes.
- [x] Johan har bekræftet, at dropdown og gemt status nu vises korrekt, når tilbuddet åbnes igen.
- [x] SQL-rettelsen `supabase/migrations/202610200002_offer_status_id_types.sql` virker i Johans miljø: gemning og genindlæsning er bekræftet efter den tidligere `text = uuid`-fejl. Codex har ikke kørt SQL eller kontrolleret migrationshistorikken.
- [x] Projektets tilbudsvisning viser eksplicit Kladde og forklarer overgangen til færdiggjort tilbud.
- [x] Produktionsbuild bestået 20. oktober 2026; kendte størrelses- og CommonJS-advarsler består. Ingen nye spec-filer.
- [x] Statusvalg på færdigt tilbud og aktuel status i tilbudshistorikken.
- [x] Manuel markering som sendt samt accepteret/afvist; status kan rettes igen.
- [x] Gemning bruger `update_offer_status` med kontrol af virksomhedsmedlemskab og samtidig statusændring. Appen genlæser status før succesbesked og beskytter mod dobbeltklik.
- [x] Statusfunktionen er tilgængelig i Johans miljø; gemning via funktionen er bekræftet. Codex har ikke kørt migrationerne eller kontrolleret migrationshistorikken.
- [x] Projektets udkast bevares som kladde indtil færdiggørelse.
- [x] Startstatus Færdiggjort på nyt tilbud er bekræftet som del af den samlede tilbudsflowtest.
- [x] Johan har bekræftet skift mellem Sendt, Accepteret og Afvist samt genindlæsning; oversigt og dropdown viser gemt status.
- [x] Johan har bekræftet, at PDF er uændret efter statusskift. Statusfunktionen opdaterer kun statusfeltet.
- [ ] Kontrollér adgang til andre virksomheders tilbud. Gemning på eget tilbud er bekræftet; adgang på tværs af virksomheder er endnu ikke afprøvet. Codex har ikke kørt databaseændringer.

Den samlede liste ovenfor er baseret på Johans originale TODO-liste. Åbne punkter er endnu ikke gennemgået og godkendt som afsluttede.

## Arbejdsgang
- Vis den opdaterede TODO-liste, hver gang en disciplin afsluttes.
- Arbejd kun i projektmappen; adgang udenfor kræver Johans godkendelse.
- Databaseændringer kræver Johans godkendelse.
- Opret ikke spec-filer fremover, efter Johans ønske. Kontrollér ændringer med build og relevante manuelle kontroller.

## Gennemgang af tilbudsbetingelser — 16. oktober 2026
- Ingen konkrete fejl fundet ved kodegennemgangen. Migrationen er kun læst, ikke kørt.
- Build: `npm.cmd run build` bestået. Advarsler: initial bundle 629,52 kB mod 500 kB; offer-preview SCSS 4,12 kB og project-sidebar SCSS 7,34 kB mod 4 kB; CommonJS-afhængigheder fra pdfmake.
- Tidligere målrettede kontroller ovenfor er registreret fra den eksisterende liste; de er ikke genkørt ved denne gennemgang.
- Johan har bekræftet alle beskrevne funktionelle tests. Tilbudsbetingelser er funktionelt afsluttet; kontrol af migrationshistorikken er et separat udrulningspunkt.
