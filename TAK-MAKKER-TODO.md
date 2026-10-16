# Tak Makker TODO — 16. oktober 2026

## 1. Nødvendigt før første kunde

- [x] **Tilbudsbetingelser** — Gyldighed, betalingsbetingelser og eventuelle forbehold.
- [x] **Virksomhedsprofil** — Sikre at firmanavn, CVR, adresse, telefon og e-mail er udfyldt og bruges korrekt.
- [ ] **Logo på PDF** — Mulighed for at uploade virksomhedens logo.
- [ ] **Tilbudsstatus** — Kladde, færdiggjort, sendt, accepteret og afvist.
- [ ] **Korrekt håndtering af ændringer** — Manuelle rettelser må ikke blive overskrevet af AI.
- [ ] **Test af hele tilbudsflowet** — Fra første AI-besked til færdig PDF, også efter reload.

## 2. Vigtigt til en solid MVP

- [ ] **Sikkerhed og adgang** — Gennemgå Supabase RLS og sikre, at virksomheder kun ser egne data.
- [ ] **Fejlhåndtering** — Tydelige fejlbeskeder, loading og beskyttelse mod dobbeltklik.
- [ ] **Mobil og tablet** — Tilpasse layout, faner, formularer og tilbudsvisning.
- [ ] **Validering** — Tjek af obligatoriske felter, tal, priser og ugyldige input.
- [ ] **PDF-finpudsning** — Sideskift, lange beskrivelser, mange opgaver og materialer.
- [ ] **Deployment** — Miljøvariabler, produktionsdatabase, domæne og fejllogning.

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

## Næste session

- Næste disciplin er Logo på PDF. Arbejdet er stoppet for i dag efter Johans ønske.

Den samlede liste ovenfor er baseret på Johans originale TODO-liste. Åbne punkter er endnu ikke gennemgået og godkendt som afsluttede.

## Arbejdsgang
- Vis den opdaterede TODO-liste, hver gang en disciplin afsluttes.
- Arbejd kun i projektmappen; adgang udenfor kræver Johans godkendelse.
- Databaseændringer kræver Johans godkendelse.
- Opret ikke spec-filer fremover, efter Johans ønske. Kontrollér ændringer med build og relevante manuelle kontroller.

## Seneste gennemgang
- Ingen konkrete fejl fundet ved kodegennemgangen. Migrationen er kun læst, ikke kørt.
- Build: `npm.cmd run build` bestået. Advarsler: initial bundle 629,52 kB mod 500 kB; offer-preview SCSS 4,12 kB og project-sidebar SCSS 7,34 kB mod 4 kB; CommonJS-afhængigheder fra pdfmake.
- Tidligere målrettede kontroller ovenfor er registreret fra den eksisterende liste; de er ikke genkørt ved denne gennemgang.
- Johan har bekræftet alle beskrevne funktionelle tests. Tilbudsbetingelser er funktionelt afsluttet; kontrol af migrationshistorikken er et separat udrulningspunkt.
