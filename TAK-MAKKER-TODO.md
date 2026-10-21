# Tak Makker TODO — 20. oktober 2026

## 1. Nødvendigt før første kunde

- [x] **Tilbudsbetingelser** — Gyldighed, betalingsbetingelser og eventuelle forbehold.
- [x] **Virksomhedsprofil** — Sikre at firmanavn, CVR, adresse, telefon og e-mail er udfyldt og bruges korrekt.
- [x] **Logo på PDF** — Mulighed for at uploade virksomhedens logo.
- [x] **Tilbudsstatus** — Kladde, færdiggjort, sendt, accepteret og afvist. Funktionelt bekræftet; særskilt kontrol af adgang og nyt tilbud står nedenfor.
- [x] **Korrekt håndtering af ændringer** — Manuelle rettelser må ikke blive overskrevet af AI. Johan har bekræftet appkontrollerne.
- [x] **Test af hele tilbudsflowet** — Johan har bekræftet det samlede flow fra første AI-besked til færdig PDF, også efter genindlæsning.

## 2. Vigtigt til en solid MVP

- [x] **Sikkerhed og adgang** — RLS, rettigheder, databasefunktioner, appadgang og direkte AI-adgang kontrolleret med to virksomheder i begge retninger.
- [ ] **Mobil og tablet** — Tilpasse layout, faner, formularer og tilbudsvisning.
- [ ] **Vercel: skift fra React til Angular** — Vercel bruger i dag det gamle React-projekt i et andet repo. Tilknyt dette Angular-projekts repo, konfigurér Angular-build, outputmappe, miljøvariabler og routing, og kontrollér deployment samt genindlæsning af undersider.
- [ ] **Validering** — Tjek af obligatoriske felter, tal, priser og ugyldige input.
- [ ] **Fejlhåndtering** — Tydelige fejlbeskeder, loading og beskyttelse mod dobbeltklik.
- [ ] **PDF-finpudsning** — Sideskift, lange beskrivelser, mange opgaver og materialer.
- [ ] **Deployment** — Miljøvariabler, produktionsdatabase, domæne og fejllogning.

## 3. Efter MVP

- [ ] **Send tilbud** — Send PDF direkte til kunden via e-mail.
- [ ] **Tilbudsrevisioner** — Opret ny version af et tidligere færdiggjort tilbud.
- [ ] **Kundekartotek** — Gem kunder og genbrug deres oplysninger.
- [ ] **Abonnement og betaling** — Betalingsløsning, abonnementer og forbrugsgrænser.
- [ ] **AI-forbedringer** — Bedre faglige forslag og hjælp til estimering af tid og materialer.
- [ ] **Dashboard** — Overblik over tilbud, samlet værdi og acceptprocent.

## Brugeroplevelse — nye forbedringer

- [x] **AI i samtalepanelet** — Animation og skiftende ventetekster som i startmodalen. Johan har bekræftet, at det virker.
- [x] **Tydelige nye forslag** — Overblik med antal nye opgaver/materialer, knapper til fanerne og markering af nye forslag. Johan har bekræftet, at det virker; efterfølgende ankerforbedring afventer appkontrol.
- [ ] **God afslutning ved færdiggørelse** — Implementeret 21. oktober: succesanimation og modal med gemt tilbudsnummer, pris inkl. moms, Se tilbud og Download PDF. Afventer Johans appkontrol.
- [ ] **Diskret gemmestatus ved felter** — Gemmer… → Gemt ✓ tæt på den redigerede værdi.
- [ ] **PDF-generering med personlighed** — Animation og ventetekster under faktisk PDF-generering.

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

- Brugeroplevelse: Afprøv succesmodalen ved færdiggørelse. Derefter diskret gemmestatus ved felter, PDF-generering med personlighed og Fejlhåndtering.

### Succesmodal ved færdiggørelse — 21. oktober 2026

- [x] Modal åbner efter bekræftet færdiggørelse og viser nummer samt pris inkl. moms fra den gemte tilbudskopi.
- [x] Kort succesanimation med respekt for reduceret bevægelse; Se tilbud, Download PDF og Tilbage til projektet. Native dialog med fokus og Escape; lukning og knapper låses under PDF-download.
- [x] PDF hentes fra det færdige tilbud. Ved PDF-fejl bevares succes og tilbuds-ID, og brugeren kan prøve download igen uden ny færdiggørelse.
- [x] Produktionsbuild og målrettede kontroller med faktisk komponentklasse/simulerede afhængigheder bestået: gemt pris, succes efter gemning, dobbeltklik, PDF-kopi, lås under download, PDF-fejl og genforsøg. Ingen spec-filer, SQL eller Edge-udrulning.
- [ ] Johan: Færdiggør et tilbud og kontrollér modal, tilbudsnummer, pris, Se tilbud, Download PDF samt lukning med Escape/Tilbage til projektet. Kontrollér også på lille skærm.

### AI-feedback og nye forslag — funktionelt bekræftet

- [x] Johan har bekræftet, at AI-feedback og overblik over nye forslag virker rigtig godt.
- [x] Overblikkets knapper skifter nu fane og scroller efter rendering til første nye opgave/materiale. Se samtalen scroller til den nyeste besked. Målet får tastaturfokus; reduceret bevægelse respekteres.
- [x] Startmodalens pulje af ventetekster er udvidet fra 8 til 24 beskeder. Skifteinterval er fortsat 1,8 sekund.
- [ ] Johan: Kontrollér, at knapperne scroller til det nye forslag både fra en anden fane og ved klik på den allerede aktive fane.

- [x] Produktionsbuild bestået med kendte størrelses- og CommonJS-advarsler. Målrettede kontroller med faktiske klasser og simulerede afhængigheder bestået: optælling af gemte entydige forslag, udelukkelse af eksisterende/afviste linjer, tomt resultat, dobbeltklik, fejl uden falsk succes, navigation og oprydning af teksttimer. Ingen nye spec-filer eller databaseændringer.
- [x] Spinner og tilfældigt skiftende tekster hver 1,8 sekund under beskedgemning, AI-kald og gemning af svar. Status er også synlig ved skift til Opgaver/Materialer. Timer ryddes ved afslutning og komponentens fjernelse; reduceret bevægelse respekteres.
- [x] Overblik over faktisk gemte nye forslag med entydige ID'er. Eksisterende/afviste linjer tælles ikke som nye. Knapper åbner Opgaver, Materialer eller Samtale. Nye foreslåede linjer får mærket Nyt forslag.
- [x] Tydelig afslutning også når der ikke er nye forslag. Overblik og markeringer gælder seneste svar i den åbne session, kan lukkes og nulstilles ved næste AI-besked eller genindlæsning. Selve forslagene er gemt i databasen.
- [x] Succes vises først, når svar og eventuelle spørgsmål er gemt og projektet genlæst. Dobbeltklik blokeres, indtastning låses under afsendelse, og fejl viser om beskeden blev gemt.
- [x] Johan har bekræftet appkontrollen af AI-feedback og nye forslag. Ankerforbedringen står særskilt ovenfor.

## Afsluttet disciplin: Sikkerhed og adgang

Status: Afsluttet for det gennemgåede scope i Johans miljø — opsætningskontrol, 22 databasekontroller, browserkontrol og direkte Edge-AI-kontrol med to virksomheder i begge retninger er bekræftet. Kontrollerne er ikke en garanti for alle tænkelige sikkerhedsforhold; nye ændringer og andre miljøer kræver relevant kontrol.

- [x] Gennemgået login/rutebeskyttelse, virksomhedskald, AI-funktionens token-/medlemskontrol og statusfunktionens medlemskontrol og EXECUTE-rettigheder i repoet.
- [x] Ingen service-role-/private-nøglemarkører fundet ved afgrænset tekstsøgning i `src` og `supabase`.
- [x] Oprettet `SIKKERHED-OG-ADGANG.md` med fund og åbne kontroller samt `supabase/audits/security_access_audit.sql`, som kun læser databaseopsætning og ikke kundedata. Ingen databaseændringer eller live forespørgsler er kørt af Codex.
- [x] Johan har delt metadataeksporten. RLS er aktiv på alle ni tabeller, og politikkerne afgrænser efter virksomhedsmedlemskab. Den efterfølgende databaseadgangstest er registreret nedenfor.
- [x] Fundet direkte INSERT-adgang til færdige tilbud/linjer samt for brede tabel-/funktionsrettigheder. Rettelse klargjort i `supabase/migrations/202610200003_access_hardening.sql`; efterkontrol i `supabase/audits/security_access_verify.sql`.
- [x] Lokalt sammenlignet de to nye RPC'er med originalerne: eksisterende forretningslogik er bevaret. Codex har ikke kørt SQL; Johan har efterfølgende kørt migrationen og databasekontrollerne i sit miljø.
- [x] Johan har kørt rettelsen og bekræftet true på alle rækker i efterkontrollen.
- [x] Johan har bekræftet appflowet efter rettighedsændringen: Nyt projekt, AI, udfyldning/linjer, færdiggørelse og PDF. Profil- og statusrettigheder er desuden afprøvet i databasekontrollen.
- [x] Efter afvisning af det oprindelige bruger-ID er valgt en ny testbruger. Johan har bekræftet opsætningen af den separate bruger/virksomhed. Codex har ikke oprettet bruger eller kørt SQL.
- [x] Klargjort `supabase/audits/security_two_company_test.sql` med de to bruger-ID'er fra opsætningen. Tester egne og fremmede data/RPC'er som authenticated i begge retninger, inkl. midlertidig projekt- og tilbudsoprettelse. Afslutter med ROLLBACK. Scriptet er ikke runtime-testet lokalt.
- [x] Johan har delt alle 22 beståede databasekontroller: egne oprettelser/redigeringer/færdiggørelse/status, egen/fremmed læsning på alle ni tabeller og afvist fremmed skrivning, medlemskab, referencer, tilbudsændring og RPC i begge retninger.
- [x] Johan har bekræftet afvisning af fremmede projekt- og tilbudslinks ved den beskrevne browserkontrol i begge retninger. Ingen fremmede data vises.
- [x] Klargjort `supabase/audits/security_ai_browser_check.js`: benytter eksisterende login og et indsat fremmed projektlink til den sidste direkte Edge-kontrol. Logger kun resultater/statusser, ikke tokens. Afviser at kalde AI, hvis projektet kan læses. Testet lokalt med simuleret HTTP; ikke kørt mod Supabase af Codex.
- [x] Johan har vist bestået direkte Edge-kontrol som testbrugeren: gyldigt login 200, AI-kald mod Fætter BR's projekt 404 og AI-kald uden login 401.
- [x] Johan har også vist bestået direkte Edge-kontrol som oprindelig bruger mod testvirksomheden: login 200, fremmed AI-kald 404 og AI-kald uden login 401. Alle tre resultater er true i begge retninger.

## Afsluttet disciplin: Manglende oplysninger og levende kladde

Status: Funktionelt afsluttet — Johan har bekræftet, at alle ændringer virker. Materialernes antal og enhedspris er efterfølgende justeret til trin på 1 efter Johans ønske.

- [x] Produktionsbuild bestået med kendte størrelses- og CommonJS-advarsler. Offer-preview SCSS er nu cirka 5,74 kB.
- [x] Synlig liste øverst i kladden over alle manglende projekt-/kundeoplysninger samt ugyldige accepterede opgaver og materialer. Samme validering styrer knappen til færdiggørelse.
- [x] Klik på fx Udfyld kundeadresse åbner oplysningsmodalen med fokus i det relevante felt. Mangler ved linjer åbner fanen Opgaver eller Materialer. Påkrævede projekt-/kundefelter er markeret i modalen.
- [x] Tekst, timer, materialenavn, beskrivelse, antal, enhed og pris afspejles straks i kladden under indtastning. Kun accepterede linjer indgår i tilbuddet og beregningerne.
- [x] Gemning sker fortsat, når feltet forlades. Færdiggørelse blokeres ved lokale ændringer og igangværende gemning; status og gemmefejl vises. Bekræftede lokale værdier ryddes, når de genlæste data matcher, så senere opdateringer ikke skjules.
- [x] Målrettede kontroller med faktiske klasser og simulerede afhængigheder: visning før blur, priser, blokering mens ugemt/gemmer, bekræftede værdier, null/0/ugyldige tal og liste med manglende kundeadresse bestået. Ekstra kontrol af første rendering før sidebar-input er tildelt bestået. Ingen nye spec-filer eller databaseændringer.
- [x] Johan har bekræftet listen med manglende oplysninger og klik til udfyldning.
- [x] Johan har bekræftet øjeblikkelig kladdeopdatering under indtastning samt de beskrevne gemme- og genindlæsningskontroller.
- [x] Antal og enhedspris i materialefanen bruger nu trin på 1 i stedet for 0,01.

## Afsluttet disciplin: AI-start på nyt projekt

Status: Funktionelt afsluttet — Johan har bekræftet, at det nye flow med beskrivelse, AI-ventetid og efterfølgende oplysningsmodal virker som ønsket. Supplerende mobil- og annulleringskontrol står fortsat åben nedenfor.

- [x] Produktionsbuild bestået med kendte størrelses- og CommonJS-advarsler. Ingen databaseændringer eller udrulning af Edge-funktion er nødvendig for dette flow.
- [x] Nyt projekt åbner først en beskrivelsesmodal med tekstfelt og Fortsæt. Intet projekt oprettes, før brugeren fortsætter med en ikke-tom beskrivelse.
- [x] Under oprettelse, AI-kald og gemning vises en spinner med tilfældigt skiftende tekster hver 1,8 sekund. Samme tekst gentages ikke direkte. Animation respekterer reduceret bevægelse.
- [x] Første besked gemmes i samtalen. AI-forslag, kunde-/projektoplysninger og eventuelle spørgsmål gemmes, før navigationen åbner oplysningsmodalen. Samme flow fra projektoversigt og eksisterende projekt.
- [x] Dobbeltklik og lukning under behandling blokeres. Ved fejl kan brugeren prøve igen på samme kladde eller åbne den. Gemt besked og modtaget AI-svar genbruges, så et nyt forsøg ikke opretter et nyt projekt eller gentager et allerede modtaget AI-kald.
- [x] Målrettede kontroller af den faktiske dialogklasse med simulerede afhængigheder bestået: tom besked, annullering, dobbeltklik, tekstskift, gemning før navigation, AI-/gemme-/navigationsfejl, genforsøg og oprydning af timer. Ingen nye spec-filer.
- [x] Johan har bekræftet, at det nye AI-startflow virker som ønsket efter appkontrollen.
- [ ] Johan: Kontrollér, at Annuller før Fortsæt ikke opretter en kladde, og afprøv layout på en lille skærm.

## Afsluttet disciplin: Projektoplysninger i modal

Status: Funktionelt afsluttet — Johan har bekræftet, at løsningen virker efter rettelsen af navigationen fra projektoversigten. Detaljeret mobil- og tastaturkontrol hører fortsat til MVP-kontrollen nedenfor.

- [x] Eksisterende formular flyttet til en modal: projekttitel, kunde, adresse, projekt-/tilbudsbeskrivelse, gyldighed, betalingsbetingelser og forbehold.
- [x] Rediger åbner modalen med de aktuelle gemte værdier. Gemning bruger den eksisterende service og bevarer markering af manuelle rettelser.
- [x] Nyt projekt åbner modalen automatisk efter indlæsning. Åbningen forbruges én gang og gentages ikke ved normal opdatering eller genåbning af et eksisterende projekt.
- [x] Rettet tab af åbningssignal ved oprettelse fra `/projects`: signalet følger nu navigationen, læses af destinationssiden og fjernes fra URL'en, når modalen er åbnet.
- [x] Johan har bekræftet rettelsen: Nyt projekt åbner nu modalen også fra `/projects`, og modalflowet virker som ønsket.
- [x] Native dialog med fokus i titelfelt, tastaturnavigation, Escape, lukknap og Annuller. Formular og lukning låses under gemning. Scroll og bredde tilpasses mindre skærme.
- [x] Produktionsbuild bestået med størrelses- og CommonJS-advarsler; modalens styling øger offer-preview SCSS til cirka 4,98 kB. Ingen databaseændringer eller nye spec-filer.
- [ ] Supplerende MVP-kontrol: Afprøv modalen på en lille skærm og kontrollér tastaturnavigation, Escape og fokus ved genåbning.

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
### Optimering af gemning efter AI-svar — 20. oktober 2026

- [x] Seneste måling: AI 11.333 ms, kontekst 8.116 ms, samlet 20.477 ms. Separat måling af workItemsMs, materialsMs og messagesMs tilføjet; simuleret langsom samtale og bevaret parallel hentning kontrolleret.
- [ ] Udrul og indsam­l nye TIMING-målinger med de tre separate konteksttider; årsagen til den langsomme kontekst er endnu ikke fastslået.
- [x] Måling fra udrullet funktion: AI 16.286 ms af i alt 16.936 ms; adgang og projektdata cirka 645 ms.
- [x] AI-instruktioner beder nu om nye forslag og ændrede AI-estimater frem for at gentage uændrede linjer. Uændrede kunde-/projektfelter returneres som null; gemningen bevarer eksisterende værdier.
- [x] GENERATE OFFER SIZE logger input-, output-, cache- og reasoning-tokens samt antal linjer/beskeder uden indhold. Simulerede kontroller af null/[]-gemning og tokenlog bestået; ingen betalte AI-kald.
- [ ] Udrul de opdaterede instruktioner/funktion. Kontrollér nye projekter, opfølgende estimater, bevarelse af eksisterende linjer og manuelle rettelser; sammenlign SIZE og TIMING for flere beskeder. Den faktiske kvalitets- og tidsgevinst er endnu ikke målt.
- [x] Lokale tidsmålinger i generate-offer: authMs, projectMs, membershipMs, contextMs, aiMs og totalMs. Logger kun varigheder; kontrol af succes, afvist adgang og preflight med simulerede afhængigheder bestået.
- [ ] Udrul generate-offer og aflæs GENERATE OFFER TIMING efter en ny AI-besked. Browsermålingen viste 18,56 sekunders serverventetid; fordelingen er endnu ukendt. Codex har ikke udrullet funktionen.
- [x] Projekt, opgaver, materialer og sorterede beskeder hentes med ét GET via eksisterende relationer. Ingen ændring af RLS eller database.
- [x] Afsendt besked vises fra indsættelsens svar uden fuld genindlæsning. Projektvælgeren opdateres lokalt efter AI-svar og redigering; gentagne oversigtskald er fjernet.
- [x] Kontrol med den installerede Supabase-klients query builder og simulerede HTTP-svar: ét GET, relationer, samtalerækkefølge, returformat og adgangsfejl bestået. Produktionsbuild bestået med kendte advarsler.
- [ ] Johan: Kontrollér projektindlæsning, samtalerækkefølge, AI-svar og titel i projektvælgeren efter redigering. Sammenlign GET-kald i loggen.
- [x] Uændrede værdier springes over; nye opgaver og materialer indsættes samlet pr. tabel.
- [x] Opgaver, materialer og projektoplysninger gemmes parallelt. Eksisterende linjer opdateres med højst fire samtidige skrivninger pr. kategori.
- [x] Beskyttelse af manuelle værdier, samtidige rettelser, priser og status bevares. Ved fejl afventes igangværende skrivninger før genforsøg.
- [x] Produktionsbuild og otte målrettede kontroller med simuleret database bestået. Ingen spec-filer eller databaseændringer.
- [x] Varighed for AI-endpoint og efterfølgende gemning logges separat i browserkonsollen på Debug/Verbose-niveau.
- [ ] Johan: Afprøv ny AI-besked og nyt projekt; kontrollér gemte forslag og færre databasekald. Faktisk tidsgevinst afventer måling i appen.

- Vis den opdaterede TODO-liste, hver gang en disciplin afsluttes.
- Arbejd kun i projektmappen; adgang udenfor kræver Johans godkendelse.
- Databaseændringer kræver Johans godkendelse.
- Opret ikke spec-filer fremover, efter Johans ønske. Kontrollér ændringer med build og relevante manuelle kontroller.

## Gennemgang af tilbudsbetingelser — 16. oktober 2026
- Ingen konkrete fejl fundet ved kodegennemgangen. Migrationen er kun læst, ikke kørt.
- Build: `npm.cmd run build` bestået. Advarsler: initial bundle 629,52 kB mod 500 kB; offer-preview SCSS 4,12 kB og project-sidebar SCSS 7,34 kB mod 4 kB; CommonJS-afhængigheder fra pdfmake.
- Tidligere målrettede kontroller ovenfor er registreret fra den eksisterende liste; de er ikke genkørt ved denne gennemgang.
- Johan har bekræftet alle beskrevne funktionelle tests. Tilbudsbetingelser er funktionelt afsluttet; kontrol af migrationshistorikken er et separat udrulningspunkt.
