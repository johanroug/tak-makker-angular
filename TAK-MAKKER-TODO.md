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
- [ ] **Mobil og tablet** — Responsive tilpasninger implementeret 21. oktober; afventer visuel kontrol på mobil/tablet.

  Opfølgning 24. oktober: Materialefelter tilpasses nu højrepanelets faktiske bredde via en min-width-container-query. Fanerne bevarer vandret scroll i smalle desktop-/tabletpaneler; redigerbare felter har 16 px tekst og talfelter mindst 44 px højde. Login/registrering har mere plads til felterne på mobil og bruger dynamisk skærmhøjde. Produktionsbuild bestået med kendte advarsler. Repræsentative materialekort med appens faktiske SCSS og fiktive data er visuelt kontrolleret i browser ved smal mobil, bredt enkeltkolonnelayout og 1024 px med smal højrekolonne. Dette erstatter ikke den samlede kontrol af den indloggede app.
  - [ ] Johan: Kontrollér ved 375, 768 og 1024 px: mobilmenu, materialeredigering, samtale, nyt projekt/oplysningsmodal, profil og færdigt tilbud. Kontrollér almindelig sidescroll til og med 900 px og sticky højrepanel over 900 px. Virksomhedsprofilens højre side skal fortsat være uden egen scroll.
  - [x] Rettet scrolllås over højrepanelet over 900 px: fjernet overscroll-containment på faneindhold og samtalebeskeder, så siden overtager rulning ved panelets kanter. Kompileret CSS kontrolleret og produktionsbuild bestået med kendte advarsler.
  - [x] Johan har bekræftet, at siden kan rulles med fingeren over tilbudshistorikken på tablet.
  - [ ] Kontrollér også siderulning ved begyndelsen/slutningen af en lang samtale på tablet.
  - [x] Færdiggørelsesbjælken er fast i skærmens bund i enkeltkolonnelayoutet (til og med 900 px), også efter scroll forbi kladden. ResizeObserver reserverer plads efter projektindholdet ud fra bjælkens højde; safe area og oprydning ved navigation håndteres. Desktop bevarer sticky bjælke i kladden. Produktionsbuild bestået; afventer Johans kontrol på enhed.
  - [x] Højrepanelets styles samlet i project-sidebar.component.scss med mobil som grundlayout og min-width-regler til større paneler/skærme. Separat mobilfil og reference fjernet. Repræsentative CSS-layoutkontroller før/efter ved syv bredder og med/uden samtale bestået. Størrelsesgrænsen pr. stylesheet er justeret fra 8 til 10 kB, fordi eksisterende styles nu samles i én fil; advarselsgrænsen er uændret.
  - [x] Tilbudsvisningens styles ligeledes samlet i offer-preview.component.scss. offer-preview.mobile.scss og komponentreferencen er fjernet. Mobil er grundlayoutet, større layouts tilføjes ved min-width 601/901 px. Repræsentative CSS-kontroller før/efter ved ni bredder bestået, inklusive fast/sticky bundbjælke, formular og priser. Produktionsbuild bestået med kendte advarsler.
- [x] **Vercel: skift fra React til Angular** — Repo klargjort med vercel.json (Angular, build, browser-output og SPA-routing), Node 24.x og VERCEL-DEPLOYMENT.md. Produktionsbuild og outputfiler kontrolleret. Vercel-projektet tak-makker er nu forbundet til johanroug/tak-makker-angular; Angular, npm ci, build, outputmappe og Node 24.x er kontrolleret/opsat i dashboardet. Commit eda6836 er deployet som Production/Ready på www.takmakker.dk. Angular-login er åbnet i browseren, og Johan bekræfter, at det ser rigtigt ud. Direkte projekt-, profil- og tilbuds-URL’er samt JS/CSS/logo returnerer 200 med korrekt indholdstype. Login, AI og PDF i produktion mangler stadig funktionel brugerkontrol under Deployment.
- [ ] **Validering** — Tjek af obligatoriske felter, tal, priser og ugyldige input.
- [ ] **Fejlhåndtering** — Tydelige fejlbeskeder, loading og beskyttelse mod dobbeltklik.
- [x] **PDF-finpudsning** — Nyt lyst PDF-design implementeret 21. oktober. Sideskift, lange tekster, mange linjer og logo kontrolleret lokalt; Johan har godkendt resultatet.
- [ ] **Deployment** — Miljøvariabler, produktionsdatabase, domæne og fejllogning.

## 3. Efter MVP

- [ ] **Send tilbud** — Send PDF direkte til kunden via e-mail.
- [ ] **Tilbudsrevisioner** — Opret ny version af et tidligere færdiggjort tilbud.
- [ ] **Kundekartotek** — Gem kunder og genbrug deres oplysninger.
- [ ] **Abonnement og betaling** — Betalingsløsning, abonnementer og forbrugsgrænser.
- [ ] **AI-forbedringer** — Bedre faglige forslag og hjælp til estimering af tid og materialer.
- [ ] **Dashboard** — Overblik over tilbud, samlet værdi og acceptprocent.

## Brugeroplevelse — nye forbedringer

- [ ] **Sticky færdiggørelse** — Bjælken med Færdiggør tilbud følger nu med i bunden som på virksomhedsprofilen, på mobil og desktop. Produktionsbuild bestået; afventer Johans appkontrol.

- [x] Johan har godkendt tilbudssidens nye design.
- [ ] **Tilbudsside: nyt design** — Implementeret: dokumentvisning, tydelig overskrift/status og separat pris-/handlingspanel med PDF og statusskift. Afventer Johans appkontrol.
- [x] Johan har godkendt virksomhedsprofilens nye visuelle udtryk.
- [ ] **Virksomhedsprofil: nyt design** — Implementeret: fire sektionskort, varm visuel stil, levende afsenderforhåndsvisning og sticky gemmebjælke. Afventer Johans appkontrol.
- [ ] **Sideovergange og indlæsning** — Implementeret: korte routeskift, topindikator, skeletvisninger og indtoning af færdigindlæst indhold. Afventer Johans appkontrol.
- [x] **AI i samtalepanelet** — Animation og skiftende ventetekster som i startmodalen. Johan har bekræftet, at det virker.
- [x] **Tydelige nye forslag** — Overblik med antal nye opgaver/materialer, knapper til fanerne og markering af nye forslag. Johan har bekræftet, at det virker; efterfølgende ankerforbedring afventer appkontrol.
- [x] **God afslutning ved færdiggørelse** — Succesanimation og modal med gemt tilbudsnummer, pris inkl. moms, Se tilbud og Download PDF. Johan har bekræftet, at det virker 21. oktober.
- [x] **Diskret gemmestatus ved felter** — Gemmer… → Gemt ✓ i 3 sekunder og lokal fejlbesked. Fast plads og justeret layout; Johan har bekræftet, at det virker.
- [–] **PDF-generering med personlighed** — Fravalgt af Johan: PDF-generering er næsten øjeblikkelig. Ændringen er reverted.

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

- [x] Visuel overhaling 21. oktober: firmaoplysninger, logo, timepris og betingelser i separate kort; levende afsenderforhåndsvisning på profilen og gemmebjælke. Eksisterende formularbindinger, logo- og gemmelogik samt validering bevaret. Mobile first med min-width; produktionsbuild bestået med størrelses-/CommonJS-advarsler.
- [ ] Johan: Kontrollér det nye layout på mobil/desktop, afsenderforhåndsvisning under indtastning, logo upload/fjernelse og Gem → genindlæs. Ingen SQL nødvendig.
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

- Vercel: Skift fra det gamle React-repo til Angular-projektet; kontrollér build, miljøvariabler og routing. Johan har valgt dette som næste disciplin.

### Nyt PDF-design — 21. oktober 2026

- [x] Lys brevpapirstil med varm accent, større typografi, logo, kunde-/afsenderoplysninger, læsbare tabeller, tydelig total samt sidetal og fortsættelsesheader.
- [x] PDF bruger fortsat tilbudskopiens oplysninger, priser, logo og betingelser. Gemte summer vises direkte; status tilføjes ikke til PDF.
- [x] Normale tabelrækker og korte betingelser holdes samlet. Meget lange tekster kan fortsætte over sider; tabeloverskrifter gentages.
- [x] Fem PDF-scenarier fra den faktiske service genereret, renderet og visuelt gennemgået: almindeligt tilbud, 67 linjer, meget lang beskrivelse/forbehold, logo og tomme/ældre værdier. Tekstkontrol af slutmarkører, danske tegn, margener og gemte totaler bestået. Ingen nye spec-filer.
- [x] Produktionsbuild bestået med kendte størrelses-/CommonJS-advarsler. Eksempel med fiktive data i output/pdf/tak-makker-design-preview.pdf; genererede PDF-eksempler ignoreres af Git.
- [x] Johan har godkendt det endelige PDF-design: lyse tabeller for arbejde/materialer med beskrivelse, mængde/timer, enhedspris og beløb samt tabelbaseret prisoversigt med diskret fremhævet total.
- Afprøv sideovergange og indlæsning efter Johans nye ønske.
- Mobil og tablet: Afprøv de responsive tilpasninger. Fejlhåndtering er implementeret; den sidste loginrettelse afventer bekræftelse. PDF-feedback er fravalgt af Johan.

### Mobil og tablet — 21. oktober 2026

- [x] Johan har godkendt mobilmenuens sidepaneldesign. Projektvælgerens pil har fået 16 px afstand til højre kant og reserveret tekstplads på mobil og desktop.
- [x] Mobilmenu redesignet efter Johans feedback: native modal som sidepanel fra højre, sløret baggrund, varm farvepalette, større typografi og tydelig primærhandling. Burgerknap bevaret. Fælles navigationstemplate til mobil og desktop; lukning via kryds, Escape, baggrund og ved navigation. Lukker ved resize til desktop.
- [x] Build og målrettet kontrol af drawer-livscyklus, fokus og overgang til Nyt projekt bestået; reduceret bevægelse respekteres. Visuel appkontrol af det nye design afventer Johan.
- [x] Under 1168 px vises Menu-knap med projektvælger, Nyt projekt, Virksomhedsprofil og Log ud i en foldemenu. Fra min-width: 1168px vises desktopnavigationen. Samme kontroller/data bruges i begge layouts.
- [x] Menuen lukker ved navigation/projektvalg og Nyt projekt; Escape lukker og returnerer fokus til menuknappen. aria-expanded/aria-controls og navigationslabel tilføjet. Build samt CSS-/klasselogikkontrol ved breakpoint bestået.
- [ ] Johan: Kontrollér menu ved 375, 900 og 1167 px og desktop ved 1168 px. Afprøv alle fire menupunkter samt Escape.
- [x] Johan har bekræftet reduktionen af gentagne user-kald.
- [x] Gentagne user-kald samlet i AuthService: samtidige kald deler forespørgsel, og serverbekræftet bruger genbruges i højst 30 sekunder og aldrig efter kendt tokenudløb. Projekt-/profilservices og logud bruger samme service. Login, logud, tokenskift og brugeropdatering nulstiller kontrollen; fejl caches ikke.
- [x] Produktionsbuild og simulerede kontroller af cacheudløb, samtidighed, login/logud, token-refresh, netværksfejl og gammelt svar efter kontoskift bestået. RLS, databasefunktioner og Edge-adgangskontrol er uændrede.
- [ ] Johan: Ryd Network-listen og skift hurtigt mellem projekter, tilbud og profil. Inden for 30 sekunder bør de gentagne user-kald forsvinde. Kontrollér også logud, login og sideskift efter over 30 sekunder.
- [x] Header og nyt-projekt-dialog flyttet til et fælles layout over router-outlet for indloggede sider. Projektvælgerens data bevares ved navigation mellem projekter, tilbud og profil; login er uden header. Projektændringer opdaterer den delte liste lokalt.
- [x] Fælles header bruger mobile-first styles med min-width. Produktionsbuild og kontroller af route-struktur og delt projektstate bestået; ingen nye databaseændringer eller spec-filer.
- [ ] Johan: Skift mellem /projects, et projekt, et tilbud og virksomhedsprofilen; headeren skal blive stående. Kontrollér projektvælger, ændret projekttitel, Nyt projekt → AI → oplysningsmodal og logud/login.
- [x] Efter Johans instruktion er alle breddebaserede media queries i src omlagt til min-width. Mobil er grundlayoutet; større layouts tilføjes ved 481, 601, 701 og 901 px. Kompileret CSS kontrolleret ved ti bredder, inkl. normal sidescroll til og med 900 px og panelscroll fra 901 px. Produktionsbuild bestået med størrelses-/CommonJS-advarsler.
- [x] Kladden følger også sidens rulning ved højst 900 px: fjernet intern scroll og overscroll-containment i selve tilbudsvisningen. Modaler bevarer egen scroll.
- [x] Efter Johans ønske har højrepanelet ved højst 900 px automatisk højde og følger sidens rulning. Intern lodret scroll og højdebegrænsning er fjernet for både fanernes indhold og samtalen; desktop bevarer separat scroll.
- [x] Projektvælger begrænses til skærmbredden, og header/knapper tilpasses smalle skærme. Mindre sidemarginer og afstande på mobil.
- [x] Faner kan rulles vandret; materialefelter får labels ovenover på smalle mobiler, og handlingsknapper kan brydes på flere rækker. Separate mobile styles bevarer desktop-layoutet.
- [x] Tilbudslinjer og totaler kan brydes, lange dokumenttekster kan ombrydes, og virksomhedsoplysninger har ikke længere en fast minimumsbredde på mobil.
- [x] Profil og modaler har mindre padding samt 16 px inputtekst på mobil. Ingen ændring af PDF-layout eller database.
- [x] Produktionsbuild bestået med kendte størrelses-/CommonJS-advarsler. Ingen nye spec-filer. Visuel kontrol i en browser eller på en fysisk enhed er endnu ikke udført af Codex.
- [ ] Johan: F12 → mobilikon, kontrollér bredder 375, 768 og 1024 px: projektvælger, alle faner, materialefelter, oplysningsmodal, nyt projekt, virksomhedsprofil og færdigt tilbud. Ingen vandret sidescroll; felter og knapper skal være tilgængelige.

### Sideovergange og indlæsning — 21. oktober 2026

- [x] Tilbudssiden har fået samme varme design som profilen: dokumentkort med alle gemte oplysninger og separat overblik over pris, status og PDF. Mobil viser handlinger først; desktop har sticky sidepanel fra min-width 1024 px. Kun template og styles ændret; PDF og statuslogik er bevaret. Produktionsbuild bestået med kendte advarsler.
- [ ] Johan: Kontrollér tilbudssidens nye layout på mobil/desktop, skift og genindlæs status samt download PDF. Priser og historiske tilbudsoplysninger skal være uændrede.
- [x] Justeret efter Johans feedback: forskudte lag, bevægelse, zoom, blur og lysskær erstattet af en samlet opacity-fade på 350 ms ved både routeskift og færdigindlæst indhold. Loading-feedback og reduceret bevægelse bevares.
- [x] Efter ønske om mere WOW: dybde/skalering ved routeskift, indhold der kommer frem i forskudte lag, kort gyldent lysskær og animeret loading-emblem. Indlæsning får ingen kunstig ventetid; indholdsanimationen varer 560 ms, og reduceret bevægelse slår effekterne fra. Build bestået; visuel appkontrol afventer Johan.
- [x] Angular View Transitions på routeskift: kun sideindholdet har navngiven overgang; headeren forbliver stationær. Initial navigation og ændringer kun i query/fragment springer over. Browser uden understøttelse bruger normal navigation.
- [x] Topindikator følger igangværende navigation og stopper ved succes, fejl, annullering eller skippet navigation. Ingen kunstig ventetid.
- [x] Skeletvisninger for projekt, færdigt tilbud og profil samt animate.enter på færdigt indhold. Respekterer reduceret bevægelse og bruger min-width til større skærme.
- [x] Produktionsbuild bestået med kendte størrelses-/CommonJS-advarsler. Målrettede kontroller med simulerede routerevents af navigation, terminaltilstande, query-only og reduceret bevægelse bestået. Ingen spec-filer eller databaseændringer.
- [ ] Johan: Skift mellem projekter, tilbud og profil. Kontrollér skeletvisning og indtoning, evt. med Network → Fast/Slow 4G. Faneskift skal ikke animere hele siden. Kontrollér også reduceret bevægelse og indlæsningsfejl.

### Fejlhåndtering — 21. oktober 2026

- [x] Efter Johans loginfejl: loading og fejlbesked bruger nu Angular-signals, så asynkrone loginresultater opdaterer visningen uden ekstra fokus/blur. Produktionsbuild og kontroller af ugyldigt login, netværksfejl, dobbeltklik og genforsøg bestået. Afventer appkontrol af visningen.
- [x] Login håndterer forbindelsesfejl og gentagne klik; særskilt besked ved forkert login og for mange forsøg. Logud har fejlbesked og klikbeskyttelse.
- [x] Prøv igen ved indlæsning af projektoversigt, projekt, tilbud, virksomhedsprofil, projektvælger og tilbudshistorik. Loading nulstilles ved fejl.
- [x] Fejl under opdatering vises ved siden af det åbne projekt frem for at fjerne formularen og lokale rettelser. Projektlisten har separat fejlstatus. Tilbage ved tilbudsfejl fører til projektoversigten, når projekt-ID mangler.
- [x] Produktionsbuild og målrettede kontroller af faktiske klasser med simulerede afhængigheder bestået: login/netværk/rate limit, dobbeltklik, genforsøg og bevaret projekt ved genindlæsningsfejl. Ingen spec-filer, databaseændringer eller udrulning.
- [ ] Johan: Afprøv forkert login og Offline i browserens Network-fane. Genaktivér forbindelsen og vælg Prøv igen. Kontrollér især, at projektet bliver stående ved fejl under genindlæsning efter en rettelse.

### PDF-generering med personlighed — fravalgt

- Johan har reverted løsningen og bedt om at springe punktet over, fordi PDF-generering er næsten øjeblikkelig.

### Diskret gemmestatus ved felter — 21. oktober 2026

- [x] Johan har bekræftet gemmestatus og det rettede layout.
- [x] Gemmestatus har nu reserveret højde også uden tekst, så Gemmer/Gemt ikke skubber de øvrige felter. Antal, Enhedspris og Estimeret tid har samme lodrette justering som enhedsteksten. Afventer Johans visuelle kontrol.
- [x] Efter Johans feedback forsvinder Gemt ✓ efter 3 sekunder. Ny indtastning/gemning nulstiller timeren, fejl forbliver synlige, og timere ryddes ved komponentens fjernelse. Kontrolleret med simuleret tid. Kr./timer har fået lodret justering ved inputfeltet.
- [x] Rettet layout efter Johans skærmbillede: numeriske felter/enhed har hver sin lodrette gruppe med gemmestatus nedenunder. Antal og enhed forbliver på samme række, og kr./timer står ved inputtet. Afventer visuel appkontrol.
- [x] Gemmer…, Gemt ✓ og Ikke gemt – prøv igen ved fag, opgavebeskrivelse, timer, materialenavn, materialebeskrivelse, antal, enhed og enhedspris.
- [x] Status gælder det enkelte felt og projekt. Ny indtastning fjerner tidligere succes; et ældre svar må ikke markere nyere indtastning som gemt. Eksisterende blur-gemning og kladdebeskyttelse bevares.
- [x] Produktionsbuild og kontroller af faktisk klasselogik med simulerede afhængigheder bestået: succes, fejl, genforsøg, adskilte felter/projekter og ældre svar. Kendte størrelses- og CommonJS-advarsler består. Ingen spec-filer eller databaseændringer.
- [ ] Johan: Ret fag/beskrivelse/timer og materialefelter, forlad feltet og kontrollér Gemt ✓ samt genindlæsning. Ved hurtig ny indtastning skal tidligere Gemt forsvinde.

### Succesmodal ved færdiggørelse — 21. oktober 2026

- [x] Johan har bekræftet, at succesmodalen virker fint.
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
- Følg mobile first: Mobil er grundlayoutet. Brug min-width til breddebaserede media queries, aldrig max-width. Media queries for fx reduceret bevægelse bevares.
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

## Nye brugere — egen virksomhed, 23. oktober 2026

- [x] Appen genbruger eksisterende virksomhedstilknytning eller kalder ensure_current_company for brugere uden medlemskab. Samtidige appkald deles.
- [x] SQL-migration klar: oprettelse af virksomhed og medlemskab i én transaktion, lås pr. bruger, auth.uid og adgang kun for authenticated. Eksisterende tilknytninger bevares.
- [x] Produktionsbuild og målrettede servicekontroller bestået.
- [ ] Johan: Kør supabase/migrations/202610230001_new_user_company.sql i Supabase SQL Editor. SQL er ikke kørt af Codex.
- [ ] Test ny bruger: egen virksomhedsprofil, nyt projekt og genindlæsning; kontrollér også eksisterende bruger og fortsat adskillelse mellem virksomheder.

## SVG-logo og farve — 23. oktober 2026

- [x] SVG-upload med original farve eller valgfri ensfarvet udgave; gendan originalfarver. Kilde og farve gemmes på virksomheden, mens PNG-kopien fortsat bruges i tilbud/PDF.
- [x] SVG behandles uden aktivt eller eksternt indhold. Browserkontrol af PNG-konvertering, proportioner, farve og transparens bestået. Produktionsbuild og målrettede SVG-kontroller bestået.
- [ ] Johan: Kør supabase/migrations/202610230002_svg_logo_source.sql i Supabase SQL Editor før deployment. Codex har ikke kørt SQL.
- [ ] Kontrollér upload, farveskift, gem/genindlæs, nyt tilbud/PDF samt uændret logo på gamle tilbud.

## Tilbudsnumre på tværs af virksomheder — 23. oktober 2026

- [x] Årsag fundet: projektnumre er pr. virksomhed, tilbudsrevisioner pr. projekt, men offers_offer_number_unique er global.
- [x] Migration klar: unik kombination af project_id og offer_number; præflight og transaktion, ingen ændring af eksisterende numre, RLS eller RPC.
- [x] Johan har kørt supabase/migrations/202610230003_offer_number_per_project.sql og bekræftet, at færdiggørelse nu virker.

- Rettelse efter databasekontrol: offers_offer_number_unique er et separat partielt UNIQUE INDEX, ikke en constraint. Migration 202610230003 er tilpasset det bekræftede indeks; første forsøg blev afbrudt uden ændringer. Johan har genkørt rettelsen og bekræftet, at den virker.

## Privat aktivitet og fejloverblik — 23. oktober 2026

- [x] Johan bekræfter e5a0d637-a285-447c-b548-98d2945ea579 som eneste administrator. SQL giver kun denne bruger læseadgang via beskyttet RPC; appbrugere har ingen direkte tabeladgang og kan ikke gøre sig selv til admin.
- [x] Adminside /activity med brugerfilter, fejlfilter, tidslinje og oversigt over registrerede projekter, PDF og AI-svartider. Viser op til 500 hændelser fra 30 dage, uden automatisk sletning af ældre data.
- [x] Login, projektbesøg/oprettelse, AI, manuelle linjeændringer/status, færdiggørelse, tilbudsbesøg/status, PDF og profilgemning registreres. Tekniske fejl registreres med handling/kode; ingen beskedtekst, kundedata, password, URL eller stacktrace i logpayload.
- [x] Synlig information om registreringen i appen. Logging kører i baggrunden og blokerer ikke normale handlinger. Ikke en komplet sikkerhedsaudit: browserhændelser kan mangle ved afbrudt netværk/fanelukning.
- [x] Produktionsbuild og målrettede kontroller af loggingfejl, sikker payload, oprindelige fejl, bruger-/fejlfiltre og gennemsnit bestået.
- [x] Johan har kørt aktivitetsmigrationen samt rettelsen 202610230005_activity_offer_id_type.sql. Adgangstesten er bestået: ejer tilladt, fremmed/anonym læsning og egen adminoprettelse afvist.
- [x] Johan har bekræftet, at aktivitetsoverblik og adgangskontrol virker på localhost.
- [ ] Commit/push og kontrollér aktivitetsoverblikket på produktion.

- Aktivitetslog: Johan har kørt opsætningen. Adgangstesten fandt text/uuid-forskel for offers.id. Separat rettelse 202610230005_activity_offer_id_type.sql er klar; Johan har genkørt adgangstesten med passed = true og bekræftet localhost-flowet.

## Registrering og blokering — 23. oktober 2026

- [x] /register med e-mail, passwordgentagelse, bekræftelsesmail-besked og profilflow ved session. Login linker til registrering. Eksisterende egen-virksomhed-flow genbruges.
- [x] Privat /users bag eksisterende admin-RPC: søgning, blokering/genåbning og beskyttelse af administratorens egen adgang. Ingen service-role-key i frontend.
- [x] Serverbeskyttelse klar: blokliste, restriktiv RLS på alle 9 app-tabeller, adgangstjek på privilegerede RPC-indgange og før AI. Eksisterende RPC-definitioner/nummerering bevares ved indsættelse af adgangstjek.
- [x] Appen kontrollerer adgang ved login, routeskift, fokus og hvert minut i synlig fane. Registrering, bekræftelsesflow, loginblokering og fejltilstande kontrolleret med mocks; produktionsbuild bestået.
- [x] Johan har kørt 202610230006_registration_and_access.sql og adgangstesten. passed = true: ejer tilladt, blokering stopper tabel-/RPC-adgang, genåbning virker, almindelig bruger kan ikke administrere adgang.
- [ ] Kontrollér Auth signup/Confirm Email, SMTP, Site URL og redirects efter REGISTRATION-SETUP.md. Deploy generate-offer efter SQL, og commit/push frontend.
- [ ] Manuel kontrol af registrering/e-mail og egen virksomhed; blokér en allerede indlogget testbruger, kontrollér RLS/RPC/AI, genåbn og genkør virksomheders adgangskontrol.

- Registrering/blokering: første SQL-forsøg blev afbrudt af preflight ved BEGIN-matchning uden ændringer. Matchningen er rettet til BEGIN-token og bevarer CRLF/kommentarer. Johan har genkørt migration og databasekontrol med passed = true.

## Nye brugere afventer godkendelse — 23. oktober 2026

- [x] Brugere uden godkendelsespost afvises af eksisterende can_access_app-gate (RLS, RPC og AI). Eksisterende konti godkendes ved migration, mens blokeringer bevares. Ingen tillid til bruger-metadata.
- [x] Privat Godkend bruger-knap og Afventer godkendelse-status. Fjernelse af blokering godkender ikke en afventende bruger. Login/registrering forklarer godkendelseskravet og afslutter eventuel signup-session.
- [x] Produktionsbuild og målrettede kontroller af pending/blocked/denied/active, signup uden adgang og admin-godkendelse bestået.
- [x] Johan har kørt 202610230007_user_approval.sql og adgangstesten med passed = true: nye brugere afventer, egen godkendelse afvist, ejer kan godkende, blokering har forrang.
- [ ] Test registrering → e-mailbekræftelse → afventer → ejer godkender → egen virksomhed og projekter; kontrollér eksisterende konti og deployment efter commit/push.

## Mail ved ny bruger — udskudt, 23. oktober 2026

- [ ] Send en automatisk mail til johanroug@gmail.com, når en ny bruger afventer godkendelse, med link til den private brugeradministration. Godkendelse foretages fortsat af Johan i appen.
- [ ] Vælg og opsæt mailudbyder (fx Resend eller eksisterende SMTP), sikker opbevaring af nøgler på serveren og genforsøg ved afsendelsesfejl. Test notifikationen uden at give brugeren adgang automatisk.
- Arbejdet er sat på pause efter Johans ønske. Ingen mailtjeneste er tilsluttet, og ingen mailændringer skal udrulles nu.

## Glemt adgangskode — 24. oktober 2026

- [x] Link på login, offentlig side til anmodning om nulstillingsmail og side til ny/gentaget adgangskode via Supabase Auth. Generisk mailsvar, loading, dobbeltklikbeskyttelse, ugyldigt link og adgangskodefejl håndteres. Efter gemning ryddes felter og session afsluttes, så normalt login igen kontrollerer godkendelse/blokering.
- [x] Produktionsbuild og simulerede kontroller af afsendelse, rate limit, netværksfejl, ugyldigt link, gentagelse, gemning og logud bestået. Ingen rigtige mails sendt eller adgangskoder ændret af Codex.
- [x] Johan har bekræftet, at glemt-adgangskode-flowet virker. Mailnotifikation til administrator er fortsat udskudt. Opsætning til andre miljøer er beskrevet i REGISTRATION-SETUP.md.

## Landingsside, demo og vækst — 25. oktober 2026

### Landingsside og demovideo

- [x] Offentlig Angular-forside på `/` med tilbudseksempel, klikbar gennemgang fra beskrivelse til PDF, FAQ og links til registrering/login. Godkendelseskravet fremgår. Beskyttede app-ruter bevares.
- [x] Dansk sidesprog, sidetitel og metabeskrivelse som grundlag for SEO. Forsiden indlæses som separat kodepakke.
- [ ] Gennemse forsiden og deploy til Vercel efter commit/push.
- [ ] Optag en rigtig demovideo: beskriv en opgave → ret opgaver/materialer/timer/priser → vis firmaprofil → færdiggør → hent PDF. Brug fiktive kundedata og tilføj undertekster og tekstalternativ. Indsæt videoen på forsiden; den klikbare gennemgang er ikke en video.
- [ ] Mål samme repræsentative tilbud med nuværende metode og Tak Makker, inklusive kontrol og rettelser. Dokumentér metode og resultater før konkrete besparelsestal bruges i markedsføring.

### Google og SEO

- [ ] Prioritér håndværksfag og tilbudsbehov med Johan, fx tømrer, murer/fliselægger og maler.
- [x] Bygget tre lokale fagsider: tilbudsprogram til tømrere, murere og malere med forskellige eksempler, fagligt indhold, FAQ, titler/beskrivelser og interne links. Søgevolumener er endnu ikke undersøgt.
- [x] Angular-prerendering genererer forsiden og de tre fagsider som færdig HTML med indhold og metadata. Private app-ruter forbliver browserrenderede. Appskærme indlæses i separate kodepakker.
- [x] Canonical-adresser, Open Graph, sitemap og robots.txt; private ruter får noindex og separat appskal. Vercel-routing og statisk 404-side klargjort. Produktionsbuild og kontrol af bygget HTML bestået; ingen deployment eller live-routingkontrol udført.
- [ ] Deploy og kontrollér Vercel-routing, HTTP 404, mobilvisning og indlæsningstid efter SEO-SETUP.md. Browserkontrol har været blokeret af browserens adgangspolitik.
- [ ] Verificér domænet i Google Search Console, indsend sitemap, og kontrollér indeksering, mobiloplevelse og indlæsningstid efter deployment.

### Anbefalingsprogram

- [ ] Beslut belønning, deltagere og hvornår en ny kunde tæller som betalende. Fastlæg vilkår for refundering, selvhenvisning og misbrug.
- [ ] Afklar betalingsløsning og sikker serverbekræftelse af betaling, før belønninger automatiseres.
- [ ] Implementér personlige invitationslinks og serverregistrering af henvisninger. Bevar henvisningen gennem registrering uden at give adgang før administratorgodkendelse.
- [ ] Implementér belønning efter bekræftet betaling, beskyttelse mod dobbeltbelønning og adminoverblik. Test tilbagebetaling, annullering og gentagne betalingshændelser.
- [ ] Vis program og vilkår til kunderne, når belønning og betalingsflow er klar. Programmet er endnu ikke implementeret.
