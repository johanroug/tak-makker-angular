# Sikkerhed og adgang

Status: Afsluttet for det gennemgåede scope i Johans miljø. Johan har kørt rettelsen, bekræftet opsætningskontrollen, delt alle 22 beståede databasekontroller og bekræftet almindeligt AI-/tilbuds-/PDF-flow samt afvisning af fremmede projekt-/tilbudslinks. Direkte Edge-AI-kontrol er bestået i begge retninger: gyldigt login 200, fremmed projekt 404 og uden login 401. Codex har ikke kørt SQL eller de eksterne kald. Resultaterne gælder de afprøvede operationer og erstatter ikke relevante kontroller efter nye ændringer eller udrulning i andre miljøer.

## Bekræftet resultat af databaseadgangstesten

Johan har delt 22 resultatrækker, alle med `passed = true`. For begge brugere blev egen projektoprettelse, redigering, færdiggørelse og statusændring godkendt. Direkte læsning af egne data og afvist læsning af fremmede data blev bekræftet på alle ni tabeller. Fremmede ændringer/indsættelser og RPC'er samt selvtilføjet medlemskab, referenceændringer og tilføjelse af linjer til færdige tilbud blev afvist som forventet.

Resultatet dækker den databaseadgang, SQL-scriptet udøver som authenticated med de to identiteter. Det dokumenterer ikke i sig selv login/sessioner i browseren eller den deployede Edge-funktion.

Johan har desuden vist browserafvisning af en anden virksomheds tilbuds-URL: appen viser Kunne ikke hente tilbuddet og ingen tilbudsdata. Han har derefter bekræftet samme resultat for den beskrevne projekt-/tilbudslinkkontrol i begge retninger og bekræftet normal oprettelse med AI, færdiggørelse og PDF.

## Sidste kontrol: deployet AI-endpoint

Åbn `supabase/audits/security_ai_browser_check.js`, kopiér hele filen og kør den i browserens Console/Konsol på localhost:4200, mens du er logget ind. Indsæt et faktisk eksisterende projektlink fra den anden virksomhed i dialogen. Gentag i den anden brugers browser med et link den modsatte vej.

Scriptet bruger appens eksisterende Supabase-session og offentlige konfiguration. Det printer kun HTTP-statusser og bestået/ikke-bestået. Tokens sendes kun som autorisation til appens egen konfigurerede Supabase-host og logges ikke. Scriptet stopper før AI-kald, hvis det indtastede projekt kan læses af den aktuelle bruger.

Forventet resultat: gyldigt login 200, fremmed projekt afvist af AI-endpointet med 403/404, og samme endpoint uden login med 401. Et ikke-eksisterende projekt kan også give 404, så brug et eksisterende projekt, der kan åbnes af den anden bruger. Lokale kontroller med simuleret HTTP er bestået; Codex har ikke udført de eksterne kald.

Johan har vist alle tre beståede resultater både som testbrugeren mod Fætter BR's projekt og som oprindelig bruger mod testvirksomheden: login 200, fremmed AI-kald 404 og AI-kald uden login 401. Den direkte Edge-kontrol er dermed bestået i begge retninger.

## Resultat af Johans metadataeksport før rettelsen

- RLS er slået til på alle ni tabeller. SELECT- og skrivepolitikker afgrænser til medlemskab i projektets virksomhed. Ingen public-views er registreret i eksporten. Dette er en vurdering af opsætningen, ikke en gennemført test med to brugere.
- `company_members` har kun en SELECT-politik, begrænset til brugerens eget medlemskab. De brede skriverettigheder giver derfor ikke i sig selv ret til at oprette medlemskaber.
- `anon` og `authenticated` har unødigt brede tabelrettigheder. De viste RLS-politikker har kun `authenticated` som målrolle, så eksporten dokumenterer ikke, at anonyme kan læse kundedata. Rettighederne bør alligevel begrænses til de operationer, appen bruger.
- **Konkret integritetsproblem:** `offers`, `offer_work_items` og `offer_materials` tillader direkte INSERT for virksomhedens medlemmer. En bruger kan dermed oprette tilbud uden om færdiggørelsens validering eller føje linjer til en allerede færdiggjort tilbudskopi. Det kan gøre visning/PDF og gemte summer uenige.
- `create_project` og `finalize_offer` er aktuelt security invoker med tom search_path og afhænger af RLS. De er også kaldbare af anon/PUBLIC, selv om RLS begrænser deres datakald. `update_offer_status` har eksplicit medlemskontrol og begrænsede EXECUTE-rettigheder som forventet.
- ID- og referencefelter kan aktuelt opdateres på kladder via de brede tabelrettigheder, så længe RLS tillader både gammel og ny virksomhed. Rettelsen begrænser UPDATE til de felter, formularer og AI faktisk redigerer.

## Klargjort rettelse

`supabase/migrations/202610200003_access_hardening.sql` udføres som én transaktion og:

1. Kontrollerer, at de to eksisterende RPC-definitioner matcher den gennemgåede eksport. Ved en ændret definition stopper scriptet før rettelserne.
2. Bevarer RPC'ernes forretningslogik, men tilføjer eksplicit login-/medlemskontrol, inden de kører med ejerrettigheder. Færdiggørelsen låser det autoriserede projekt mod samtidig flytning.
3. Fjerner klienternes direkte skriveadgang til færdige tilbud/linjer og fjerner deres INSERT-politikker. Kun færdiggørelsesfunktionen kan oprette tilbudskopien.
4. Fjerner anonyme tabelrettigheder og begrænser authenticated til læsning, indsættelse af kladdelinjer/beskeder og opdatering af konkrete redigerbare kolonner. Medlemskaber kan kun læses.
5. Fjerner anon/PUBLIC-adgang til de tre klient-RPC'er samt klienternes EXECUTE-adgang til triggerfunktioner.
6. Fjerner klientrollers ret til at oprette databaseobjekter i public-skemaet.

Ingen historiske tilbud eller andre forretningsposter ændres af migrationen. Service-role-rettigheder berøres ikke. Brug samme SQL Editor-forbindelse, som auditten blev kørt i. Scriptet er beregnet til én anvendelse; en ny kørsel stopper, fordi funktionernes definitioner er ændret af rettelsen selv.

Lokal kontrol: De to nye RPC'er er sammenlignet med de eksporterede originaler. Bortset fra autorisationskontrol, eksplicit returtypeskema og security definer er nummerering, beregninger, validering og snapshot-indsættelser uændrede. En PostgreSQL-runtime er ikke tilgængelig lokalt, så migrationen er ikke kørt eller runtime-testet her.

Efter migrationen køres `supabase/audits/security_access_verify.sql`. Alle rækker skal vise `passed = true`. Kontrollen læser kun katalogoplysninger og erstatter ikke testen med to virksomheder. Test desuden appens profilgemning, nyt projekt med AI, linjerettelser, færdiggørelse, status og PDF.

## Fund fra lokal kode

- Browserklienten bruger `environment.supabasePublishableKey`. En søgning i `src` og `supabase` fandt ingen service-role-nøglemarkører eller private nøgler. Det er en begrænset tekstsøgning, ikke en fuld hemmelighedsscanning.
- Beskyttede Angular-ruter kontrollerer, om brugeren er logget ind. Virksomhedsadgang skal håndhæves i databasen; et route-ID eller browserfilter er ikke en adgangskontrol.
- Projektlisten og virksomhedsprofilen finder virksomheden via den indloggede brugers medlemskab.
- Detaljevisning og ændringer henter/opdaterer via projekt-/tilbuds-ID. Sikkerheden af disse kald afhænger derfor af de faktiske RLS-regler.
- `generate-offer` validerer brugerens token med `auth.getUser` og kontrollerer virksomhedsmedlemskab, før samtale og linjer læses og sendes til AI. `verify_jwt = false` i konfigurationen betyder, at funktionen selv står for kontrollen; kontrollen findes i koden. Den deployede version er ikke verificeret.
- Statusfunktionen er `security definer`, har tom `search_path`, validerer status og kontrollerer virksomhedsmedlemskab før opdatering. Funktionen opdaterer kun status. Repoet fjerner EXECUTE fra PUBLIC og anon og giver authenticated adgang. Live opsætning og afvisning på tværs af virksomheder er ikke verificeret.
- Definitionerne af `create_project` og `finalize_offer` samt RLS-politikkerne er nu modtaget i Johans metadataeksport; vurderingen står ovenfor. De ligger fortsat ikke som oprindelige migrationsfiler i repoet.

## Næste trin

Kør `supabase/audits/security_access_audit.sql` i Supabase SQL Editor og gem JSON-resultatet til gennemgangen. Scriptet læser kun katalogoplysninger: datatyper, RLS-flag, politikker, rettigheder, funktioner, constraints, triggere og views. Det ændrer ikke databasen og læser ingen kunde-, projekt-, medlems- eller brugerposter.

Resultatet skal især bruges til at kontrollere:

1. RLS og afgrænsning ved SELECT, INSERT, UPDATE og DELETE på alle ni app-tabeller.
2. At medlemskaber ikke kan oprettes eller flyttes vilkårligt af en almindelig bruger.
3. At ændring af `company_id`, `project_id` eller `offer_id` ikke kan flytte data ind i eller ud af en anden virksomhed.
4. At tilbudskopier og deres linjer ikke kan ændres direkte; status ændres gennem den afgrænsede funktion.
5. At RPC'er kontrollerer bruger og virksomhedsmedlemskab, og at privilegerede funktioner har sikker `search_path` og passende EXECUTE-rettigheder.
6. At eventuelle views og ekstra funktioner ikke giver en alternativ adgang til beskyttede data.

## Test efter gennemgang af politikker

Brug to testbrugere i hver sin virksomhed med testdata. Kontroller både tilladt adgang til egne data og afvist læsning/skrivning på den anden virksomheds ID'er, herunder RPC'er og AI-funktionen. En kontrol af en URL alene dokumenterer ikke skrivebeskyttelsen. SQL Editor med administratorrollen dokumenterer heller ikke en almindelig brugers RLS-adgang.

Kør hele `supabase/audits/security_two_company_test.sql` i SQL Editor. Filen bruger den oprindelige bruger og den nye testbruger fra opsætningen og kontrollerer først, at de tilhører hver sin virksomhed. Testen skifter derefter til rollen authenticated og sætter testidentiteten gennem lokale JWT-claims. Ingen adgangskoder eller bruger-tokens indgår.

Testen opretter midlertidige projekter, linjer, beskeder og færdige tilbud gennem appens reelle funktioner. Den bekræfter korrekt total og statusændring, læsning af egne data på alle ni tabeller, ingen læsning af fremmede data, afvist fremmed opdatering/indsættelse, beskyttelse af medlemskab og referencekolonner, afvisning af ekstra tilbudslinjer samt afvisning af RPC'er mod fremmed virksomhed. Kontrollerne køres i begge retninger.

Alle ændringer er i samme transaktion med afsluttende ROLLBACK. Kør derfor hele filen inklusive ROLLBACK. Resultatrækker vises før tilbagerulningen; SQL Editor kan også vise en generel succesmeddelelse. Enhver fejlet assertion udløser en SQL-fejl. Ingen PostgreSQL-runtime er tilgængelig lokalt, så scriptet er endnu ikke kørt af Codex.

SQL-testen efterligner databaseidentitet og rolle, men tester ikke login med et reelt token, browseren, download eller Edge-AI-endpointet. Disse kontroller står fortsat åbne.

### Opret den anden testvirksomhed

1. Opret en ekstra testbruger i Supabase Authentication, og kopiér dens bruger-ID (UUID).
2. Indsæt ID'et som `test_user_id` i `supabase/audits/create_access_test_company.sql`, og kør hele filen i SQL Editor. Denne fil opretter nye testdata; den er ikke en læseforespørgsel. Eksisterende medlemskaber afvises før indsættelser.
3. Log ind som testbrugeren i et separat browservindue eller en anden browserprofil. Opret et projekt og et færdiggjort testtilbud. Den oprindelige virksomhed og testvirksomheden skal hver have et projekt og et tilbud til adgangstesten.
4. Kontrollér samtidig, at oprettelse, AI, linjer, færdiggørelse, status og PDF fungerer med de nye rettigheder.

Testvirksomheden indeholder tydeligt markerede, fiktive virksomhedsoplysninger. Der sendes ingen e-mail fra opsætningsscriptet. Testdata slettes ikke automatisk.

## Referencer

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase: Database functions](https://supabase.com/docs/guides/database/functions)
