# Beskyttelse mod gentagne tilbudskald

`generate-offer` bruger den gemte brugerbeskeds ID som idempotensnøgle. Både
projektsamtalen og dialogen til nye projekter sender `messageId`. Ældre klienter
uden ID understøttes ved at udlede den seneste brugerbesked fra databasen.
Projekt, medlemskab, adgang og beskedtilhørsforhold kontrolleres på serveren.

## Allerede implementeret

- Højst én igangværende tilbudsgenerering pr. projekt, håndhævet med et unikt
  PostgreSQL-indeks og virksomhedens billing-rækkelås.
- Kun første request for en besked kan markeres som sendt til OpenAI. SDK'ets
  automatiske retries er fortsat slået fra.
- Vellykket svar gemmes i `offer_generations` samtidig med afregning af kundens
  kvote. Gentagne requests får det gemte svar og en frisk kvotestatus uden nyt
  OpenAI-kald eller ekstra kvoteforbrug. Det omfatter billedanalysens resultat-ID'er.
- Fejl før afsendelse (fx opbrugt budget) frigiver beskedens lås og kan prøves
  igen. Efter markering som afsendt bliver en fejlet eller ukendt forespørgsel
  aldrig automatisk genudført for samme besked. Brugeren må sende en ny besked.
- Efter tre afsendte, fejlede kald inden for fem minutter sættes alle virksomhedens
  projekter på pause indtil ét minut efter den seneste fejl. Gennemførte svar kan
  stadig hentes fra cachen. Afvisninger før OpenAI tæller ikke som udbyderfejl.
- Kundens kvote frigives ved fejl. Udgiftsbudgettet afregnes efter kendt tokenforbrug
  eller beholder hele reservationen ved ukendt forbrug (fx timeout eller parsefejl).
- En lås har fem minutters levetid, længere end OpenAI-klientens 90 sekunders
  timeout. Næste claim rydder udløbne låse for virksomheden: usendte forsøg kan
  prøves igen; sendte forsøg markeres som fejlede. En gammel worker kan ikke sende
  efter låsens udløb/genoprettelse. Kundekvoten for et tilknyttet afsendt forsøg
  frigives, mens udgiftsreservationen bevares.

Beskyttelsen gælder én gemt besked, ikke identisk tekst i nye beskeder. En bruger
kan fortsat bevidst sende en ny besked med samme tekst; virksomhedskvoten og det
globale budget begrænser forbruget. Browseren kan ikke manipulere guard-tabellen
eller kalde guard-funktionerne direkte. Cache indeholder projektets strukturerede
AI-svar og slettes sammen med projektet/beskeden. Den må ikke ryddes, mens en
besked fortsat skal være beskyttet mod genudførelse.

## Brugerbeskeder

- Igangværende projekt: “AI arbejder allerede på projektet. Vent på svaret, og prøv igen.”
- Fejlpause: “AI har haft flere fejl. Vent et minut, og prøv igen.”
- Fejlet besked: “AI-kaldet for denne besked fejlede. Send en ny besked for at fortsætte.”
- Forældet besked: “Der er en nyere besked i projektet. Genindlæs projektet.”

Cache og kvoteafregning er atomiske i databasen. Selve anvendelsen af svaret til
projektets opgaver/materialer og assistentbeskeder sker fortsat i frontend.
Beskyttelsen her sikrer ét udbyderkald; den er ikke en transaktion for alle
frontendens efterfølgende gemmeoperationer.

## Deployment og kontrol

Anvend først budgetmigrationen `202611170001_global_ai_budget.sql` og derefter
`202611170002_offer_request_guard.sql`. Deploy `generate-offer` og
`transcribe-audio`, og deploy frontend. De gamle endpoints bruger ikke de nye
tabeller; migrationerne alene aktiverer derfor ikke beskyttelsen.

`node scripts/check-offer-request-guard.mjs` afprøver migrationens SQL-funktioner
i isoleret PGlite/PostgreSQL: rettigheder, konkurrerende claims, projektlås,
cached replay, afsendelsesmarkering, kvoterefusion, udløbne workers og fejlpause.
`node scripts/check-image-backend.mjs` afprøver det faktiske endpoint med mocks,
herunder afvist guard, cached svar, startfejl og fejl ved afslutning. Ingen
Supabase-/OpenAI-kald foretages af testene.
