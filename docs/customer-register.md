# Kundekartotek

## Status og checkpoint

Implementeringen er forberedt i kodebasen. Produktionsmigrationen er ikke kørt,
og hverken webappen eller Edge Function er deployet til produktion som del af denne ændring.
Den eksisterende produktionsdatabases tabel-/kolonnenavne blev kontrolleret
read-only: projekter har hidtil kundeoplysninger direkte; ingen customers-tabel.

Hosted test er nu også gennemført i `hovedet-test` (`woxioycjdjucxqiyqcyr`):
backup-gendannelsen verificerede alle 53 importerede COPY-tabeller.
Kundemigrationen blev kørt i testprojektet med før/efter-kontrol af produktdata og
tilbudssnapshots. De 18 projekter, 85 beskeder og 21 tilbud er bevaret, og der
blev dannet syv kundeposter. `supabase/tests/customer_register_behavior.sql`
bestod på den faktiske hosted database, inklusive finalize_offer, RLS under
authenticated, blokering og anonym adgang. Testfixtures blev rullet tilbage.

Start den lokale testapp med `npm run start:staging` på `http://127.0.0.1:4201`.
Den separate staging-konfiguration erstatter kun Supabase URL/publishable key
ved dette eksplicitte valg. Standard produktionsbuild er uændret.
Efter login viser appen et testbanner. Brug login fra den gendannede database.
`generate-offer` er efterfølgende deployet kun til testprojektet den 14. november.
`OPENAI_API_KEY` er nu konfigureret i test, og Johan har gennemført live AI-test
uden AI-fejl. Arbejdsadresse og kontaktadresse holdes adskilt, kundeformularen
forudfyldes korrekt, og AI kan ændre arbejdsadressen på et eksisterende projekt
uden at ændre den tilknyttede kundes kontaktadresse.
Talefunktionen er endnu ikke deployet eller aktiveret i testprojektet.
`billing-session` er deployet i testprojektet med understøttelse af Stripe-test
på port 4201; dens offentlige status melder fortsat checkoutReady=false.
Komplet checkout kræver også webhook-secret og tax-rate-ID.

Den 14. november er `202611130002_save_project_customer_details.sql` installeret
kun i hovedet-test. Den tilføjer gemmefunktionen, som appen kalder ved Gem
ændringer, og løste den manglende RPC/404. Hosted rollback-/adgangstesten i
`supabase/tests/project_customer_confirmation.sql` består. Ingen yderligere
tabeller eller produktionsdata er ændret med denne migration.
Kundevalget i modalen er nu en kladde; eksisterende kundevalg og ny kunde
gemmes sammen med projektoplysningerne i én transaktion. Annuller kasserer
valget. En valgt kunde vises som tekst med tydelig redigeringsknap og Skift
kunde; de to kundetyper vises først ved skift. Kundekortet uden for modalen
er fjernet, så Projektoplysninger er den fælles indgang.

Opfølgning 14. november: Johan har manuelt bekræftet, at gemning og annullering
virker i testappen, og at 404-fejlen ikke længere opleves. En read-only kontrol
bekræfter, at alle ti kundefunktioners indhold matcher de to migrationsfiler.
Integritetskontrollen af kundekoblinger, kontaktsynkronisering og RLS består.
Testdatabasen har ingen `supabase_migrations.schema_migrations`; installationen
er derfor verificeret på databaseobjekterne, ikke via registreret migrationshistorik.

Johan har også bekræftet den manuelle mobil-/desktopkontrol af kundebrugerfladen
og hele tilbuds-/PDF-forløbet i test: færdiggjorte tilbud og deres PDF'er bevarer
den oprindelige kontaktadresse efter ændring i kundekartoteket; nye tilbud og
PDF'er bruger den opdaterede adresse. Automatisk kundematch er fortsat ikke
tilsluttet brugerfladen og indgår ikke som et bestået live-testforløb.

Checkpoint før ændringen: commit `cfed17f5e62773af4d63c7e36499c122d360fce8`.
Kodearkiv og patch med de daværende lokale ændringer ligger i
`tmp/before-customer-register-20261113/` (lokalt og git-ignoreret).
Johan har bekræftet, at backup
`supabase-20261113T094328Z-43403543491-1.tar.gz.gpg` er fra før ændringen,
at databasen ikke siden var ændret, og at gendannelsestesten bestod.
Gem en separat krypteret kopi inden 30-dages-oprydningen samt adgangskoden i
passwordmanageren. Kodearkivet indeholder ikke database eller hemmelige nøgler.

## Datamodel og kompatibilitet

Postnummer og by er tilføjet som separate, valgfrie felter i migration
`202611140001_customer_postal_address.sql`, installeret kun i hovedet-test den
14. november. Eksisterende adressetekst bevares uden automatisk opdeling.
Kundeformularerne bruger den nye `save_customer_details`-RPC med versionskontrol;
den tidligere `save_customer` bevares til kompatibilitet. Samlet kontaktadresse
synkroniseres til projekternes kontaktkopi, så nye tilbud og PDF'er får gade,
postnummer og by i det eksisterende adressesnapshot. Gamle tilbud ændres ikke.
Kundesøgning omfatter også postnummer/by. Den særlige hosted rollback-test
`supabase/tests/customer_postal_address_behavior.sql` og integritetskontrollen
består i test. Lokalt består ni databasekontroller, 29 frontend-tests og build.

Migrationer: `supabase/migrations/202611130001_customer_register.sql` og
`supabase/migrations/202611130002_save_project_customer_details.sql`.

- `customers` ejer de aktuelle kontaktoplysninger pr. virksomhed. RLS beskytter
  læsning; validerede RPC'er med medlemskabs-/adgangskontrol håndterer skrivning.
- Den sammensatte foreign key `(company_id, customer_id)` forhindrer koblinger på
  tværs af virksomheder, også uden om brugergrænsefladen. Kunde er valgfri.
- Projektets `work_address` er uafhængig af kontaktadressen og har sin egen
  `work_address_source`, så AI kan rette AI-oplysninger men bevarer manuelle valg.
- Gamle `customer_name`/`customer_address` beholdes og synkroniseres via triggere.
  De eksisterende tilbudsberegninger og finalize_offer-definitionen ændres ikke.
- Eksisterende projekter med kundenavn får hver deres kundepost med projektets
  UUID. Ingen automatisk sammenlægning på navn eller adresse. Genkørsel skaber
  ikke dubletter. Oprindelig adresse bevares også som arbejdsadresse.
- `customer_match_decisions` registrerer brugerens valg af forskellige kunder.
  En eksplicit sammenlægning flytter kildens projekter til målkunden og fjerner
  kildekundeposten. Målkundens kontaktoplysninger vinder, hvilket vises før
  bekræftelse. Beskeder, opgaver, materialer og tilbud flyttes/slettes ikke.
- Eksisterende tilbud ændres ikke. Nye tilbud får snapshots af e-mail, telefon
  og arbejdsadresse; visning og PDF læser snapshots, aldrig aktuelle kundedata.
- `pending_customer_email`/`pending_customer_phone` er kun udtrækskladder før
  kundetilknytning. De bruges aldrig som aktuelle kontaktdata for en tilknyttet
  kunde. AI kan ikke ændre en eksisterende kundes stamdata.

## Brugerflade

`/customers` og `/customers/:customerId` følger eksisterende adgangskontrol.
Serverbaseret søgning dækker navn, kontaktadresse, e-mail, telefon, projekttitel,
projektnummer og arbejdsadresse. Søgetegn `%`, `_` og backslash behandles som
tekst. Debounce er 250 ms; nye søgninger annullerer ældre resultater.
Der hentes højst 25 kunder pr. side og 20 projekter pr. udvidelse/projektside.
Matchende projekter kommer først og åbnes via eksisterende projektruter.
Indekser dækker virksomhed, kunderelationer, normaliseret navn og trigram-søgning.

Der findes ikke en egentlig aktiv/inaktiv projektstatus i den nuværende model
(tilbudsstatus er en anden ting), så der er ikke indført et misvisende aktivfilter.
Seneste aktivitet beregnes fra kunde-/projekttidspunkter.

Manuelt kundevalg starter med et tomt søgefelt; der vises ikke en liste over
seneste kunder. Søgningen starter efter to tegn. **Opret ny kunde** åbner en
separat formular med sit eget navnefelt. Gemning afhænger ikke af søgestatus;
ugyldige felter får en synlig forklaring. Fejlet gemning bevarer felterne til et
nyt forsøg, og Enter i kundefelter sender ikke projektets overordnede formular.

Den samme kundeservice og vælger bruges ved kundeoprettelse, projektoprettelse
og ændring af et projekts kunde. Vælgeren har isoleret testet understøttelse af
AI-navnematches og automatisk oprettelse uden kandidat, men `autoCreate` er ikke
koblet til den nuværende projektbrugerflade. Kundevalg efter AI sker derfor
manuelt via Projektoplysninger; automatisk match/oprettelse er ikke færdigintegreret.
Fejlet søgning udløser aldrig automatisk kundeoprettelse. Valg af en eksisterende
kunde ændrer ikke dennes kontaktadresse, selv om AI har fundet en arbejdsadresse.

Kundedetaljer gemmer ved blur med versionskontrol. Et åbent projekt opdaterer
kontaktdata ved lokale ændringer, vinduesfokus og hvert 15. sekund, også efter
sammenlægning på en anden enhed. Det udskifter ikke lokale opgave-/materialerettelser.
De nye dataforespørgsler bruger RxJS; de eksisterende asynkrone oprettelsesforløb
anvender firstValueFrom ved overgangen til den nye kundeservice.

## Udrulning

1. Hosted database-/migrationstests samt de beskrevne manuelle kunde-, AI- og
   tilbuds-/PDF-forløb er bestået i hovedet-test. Automatisk kundematch mangler
   integration og skal afklares før en eventuel produktionsudrulning.
2. Kør begge migrationsfiler i rækkefølge i Supabase SQL Editor for det valgte
   projekt, eller med et eksplicit, kontrolleret projekt-ID:
   `npx supabase db query --linked --project-ref <projekt-ref> --file supabase/migrations/202611130001_customer_register.sql`
   og derefter
   `npx supabase db query --linked --project-ref <projekt-ref> --file supabase/migrations/202611130002_save_project_customer_details.sql`.
   De er allerede kørt i hovedet-test. Hver fil er én transaktion; fejl
   forhindrer en delvis migrering. Den tilføjer tabeller/felter, uden at droppe
   eksisterende felter eller ændre priser. Længdekrav valideres uden afkortning.
3. Kør `supabase/tests/customer_register.sql` i samme projekt for read-only
   integritetskontrol. Sammenlign også antal projekter, beskeder, opgaver,
   materialer og tilbud med tallene fra før migrationen.
   I staging køres også `supabase/tests/project_customer_confirmation.sql` for
   gemning, fortrydelse ved fejl, retries og virksomhedsadskillelse.
4. Deploy den opdaterede Edge Function:
   `npx supabase functions deploy generate-offer --project-ref <projekt-ref>`.
5. Byg/deploy webappen med projektets eksisterende proces. Den nye app kræver
   migrationen, så databasen skal opdateres først.
6. Kontrollér manuelt login, oprettelse, kundematch i samtalen, ændring af
   kontakt-/arbejdsadresse, dubletvalg og PDF/historiske tilbud på mobil og desktop.
   Tag derefter en ny backup af den migrerede tilstand.

`database.types.ts` er udvidet med migrationsfelterne/RPC'erne. Efter migration
kan typerne regenereres med den eksisterende Supabase-typegenerering og diffen
kontrolleres; generering fra produktion før migration vil mangle de nye typer.
Det lokale administrative virksomhedseksportværktøj bør inkludere den nye
customers-tabel ved næste virksomhedseksport; det er ikke en offentlig app-RPC.

## Tilbagerulning

Brug ikke den data-only restore-action som automatisk tilbagerulning af skemaet.
Ved fejl i brugerfladen kan gammel appkode deployes igen, mens de additive
databasefelter bevares. Ældre klienters forsøg på at ændre et tilknyttet projekts
kontaktkopi får ikke lov til at ændre kundens stamdata.
Ved behov for fuld gendannelse af tilstanden før ændringen: gendan både skema og
data fra checkpoint-backuppen i et separat kompatibelt hosted Supabase-projekt,
kontrollér adgang, tilbud/PDF og integrationer, og brug den tilsvarende gamle
kodeversion. Hosted privilegier, Storage-filer og hemmelige nøgler kræver særskilt
håndtering. Nyere data skal sikres særskilt før et skifte.

## Test

Resultat 14. november 2026: 28 Angular-tests, otte isolerede PostgreSQL-kontroller,
AI-integrationskontrollen samt produktionsbuild og SEO-check består. Buildet
giver advarsler om initial bundle, eksisterende store komponentstyles og pdfmake
CommonJS-moduler; ingen buildfejl.

- `npm test -- --watch=false`: Angular-tests for delt kundevælger, eksplicitte
  matches, ny kunde trods match, AI uden match, fejl/stale søgeresultater,
  direkte projektnavigation, pagination og versionsstyret blur-gemning.
- `node scripts/check-customer-register-db.mjs`: isoleret PostgreSQL via PGlite;
  udfører den faktiske migration to gange og tester RLS/virksomhedsadskillelse,
  FK, retries, dubletvalg, synkronisering, snapshots, pagination og adgangsblokering.
  Midlertidig testmotor: `npm install --prefix tmp/customer-db-test --no-save
  --no-package-lock @electric-sql/pglite@0.5.16`. Ingen ny app-afhængighed.
- `node scripts/check-customer-ai.mjs`: beskyttelse af stamdata, adskilte adresser,
  udtrukne kontaktfelter, manuelle adresser, AI-rettelser og samtidige kundevalg.
- `npm run build`: TypeScript, Angular-skabeloner, produktionsbuild og SEO-check.

Den isolerede SQL-test bruger en lille fixtureskemamodel og en testudgave af
Auth/adgangskontrollen. Den kontakter ikke produktion og beviser ikke i sig selv
hele Supabase-opsætningen eller faktiske AI-svar. Den supplerende hosted
databasekontrol er nu bestået. De beskrevne manuelle visuelle kontroller og live
AI-tests er efterfølgende bekræftet af Johan i test; automatisk kundematch er
fortsat ikke færdigintegreret.

## Ændrede områder

- `src/app/core/customers/customer.service.ts`: fælles søgning, gemning, projekter,
  tilknytning, versionskontrol og dubletbeslutninger.
- `src/app/features/customers/`: oversigt, detaljeside, styling og navigationstests.
- `src/app/shared/components/customer-picker/`: genbrugt kundevælger,
  projekttilknytning og tests, inklusive fejl og retries.
- `project.service.ts`, `project-detail`, `offer-preview`, `new-project-dialog`,
  `app-shell`, `workspace-state` og `app.routes.ts`: integration med projekter,
  oprettelse, løbende kontaktopdatering og navigation.
- `database.types.ts`, migrationen og `supabase/tests/customer_register.sql`:
  skema, RLS, RPC'er, dataflytning og read-only integritetskontrol.
- `supabase/functions/generate-offer/` og `_shared/` samt `project-response.ts`:
  faktabaserede kontaktfelter og adskilt arbejdsadresse i AI-kontrakten.
- `offer-detail` og `offer-pdf.service.ts`: visning af historiske kontakt- og
  arbejdsadressesnapshots, uden ændringer af beregninger.
- `scripts/check-customer-register-db.mjs` og `scripts/check-customer-ai.mjs`:
  isolerede database- og integrationskontroller.

Restore-actionen til produktion og de tidligere backupændringer er bevaret i det
eksisterende staging-område. Kun test-restore-værktøjet er committet og pushet
med `[skip ci]`; kundekartoteket og den lokale staging-konfiguration er ikke
publiceret. Det hidtidige produktionsdeploy er stadig commit `cfed17f`.
