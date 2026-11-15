# Projektbilleder

Billedfunktionen kræver eksisterende faktureringsstatus `active`, både i brugerfladen og i `generate-offer`. Status `trial`, `exhausted`, `free` og `internal` giver ikke billedadgang. Der ændres ingen tabeller, migrationsfiler, Stripe-regler eller betalingsgrænser.

## Lagring og grænser

- IndexedDB `hps-project-images`, object store `projects`, nøgle `bruger-ID:projekt-ID`.
- Højst **3 uploads i hele projektets levetid i denne browser**. En gennemført lokal lagring tæller, også hvis billedet senere slettes. Optimeringsfejl tæller ikke. En readwrite-transaktion håndhæver grænsen ved samtidige uploads.
- Billeder gemmes som Blob med ID, tidspunkt, MIME-type, størrelse, besked-ID og analysestatus. Sletning fjerner Blob og bevarer en lille metadatareference/tæller. Miniaturer bruger Object URLs, der frigives ved opdatering, projektskift, kontoskift og komponentens afslutning.
- Fotos før projektoprettelse gemmes under en lokal kladdenøgle og flyttes atomisk til det oprettede projekt. Annullerede kladder ryddes. Der er aktuelt ingen projektsletningsfunktion i appen; `ProjectImagesService.deleteProject(userId, projectId)` er oprydningsmetoden, som en fremtidig sletningsfunktion skal kalde. Sletning direkte i Supabase kan ikke automatisk fjerne data fra en offline browser.
- Input: JPEG, PNG, WebP samt HEIC/HEIF, hvis browseren kan afkode dem. HEIC uden browserunderstøttelse giver vejledning om JPEG. Højst 20 MB før optimering, 1600 px på længste side, WebP ved kvalitet 0,86 med JPEG som fallback, højst 1 MB efter optimering.
- Rydning af browserdata, anden browserprofil eller anden enhed nulstiller den lokale historik. En absolut grænse på tværs af enheder kræver central registrering og er ikke implementeret. IndexedDB er ikke krypteret kontoopbevaring; personer med adgang til samme browserprofil kan få adgang til indholdet.

## Analyse

Frontend sender `{ projectId, messageId, images: [{ id, dataUrl }] }` via det eksisterende autentificerede Supabase-kald. Data-URL er kun et midlertidigt transportformat; den gemmes ikke i Supabase, beskedhistorik eller localStorage.

Edge Function begrænser den samlede request til 4.300.000 bytes under streaming og validerer antal (1–3), individuelle størrelser, ID'er, JPEG/WebP-signaturer og billeddimensioner. Eksterne billed-URL'er accepteres ikke. Før OpenAI kontrolleres bruger, appadgang, projekt, virksomhedsmedlemskab, aktivt abonnement og at besked-ID tilhører en brugerbesked i projektet. Serveren håndhæver antal pr. request; livstidstælleren ligger alene lokalt og er ikke en sikker serverkvote.

Billeder indsættes kun i den udvalgte besked i det aktuelle Responses-kald. Historikindlæsning analyserer aldrig billeder. Fejl bevarer billederne og beskedreferencen til et nyt forsøg uden en ny brugerbesked. Et gennemført svar kvitterer med `analyzedImageIds`, så en ældre backend ikke stiltiende kan ignorere billedinput. Efter vellykket lagring markeres billederne analyseret og vedhæftes ikke ved almindelige efterfølgende kald.

Synlige observationer returneres som `imageObservations` og gemmes som almindelig assistenttekst, så senere tekstkald kan bruge dem. Feltet er valgfrit i frontend for kompatibilitet med ældre svar. Billedbaserede nye opgaver og materialer gemmes med `suggested`, uanset AI'ens foreslåede status. Eksisterende accepterede/afviste statusser bevares. Billeder indgår ikke i tilbuds- eller PDF-data.

Ingen billedpayloads skrives til applikationslogs; providerfejl logges uden fejlobjekt, da det kan indeholde request-data. Funktionen bruger ingen Storage- eller Files API og gemmer ikke billeder på serveren.

## OpenAI og omkostninger

Kontrolleret 14. november 2026: Responses-kaldet bruger fortsat den eksisterende model `gpt-5.6-luna` og `store: false`. Det fravælger Responses-applikationslagring, men er **ikke** et løfte om nul opbevaring hos OpenAI. Standardregler omfatter normalt misbrugsovervågning med op til 30 dages opbevaring; særlige sikkerheds- og lovkrav kan medføre undtagelser, herunder for billedinput. Kontoens datakontroller og aftaler skal vurderes før produktionsbrug.

- [OpenAI datakontroller og billedinput-undtagelser](https://developers.openai.com/api/docs/guides/your-data)
- [Billedinput og taksering](https://developers.openai.com/api/docs/guides/images-vision)
- [API-priser](https://developers.openai.com/api/docs/pricing)

Prisen afhænger af billedtokens, teksthistorik og svarlængde. Lokal komprimering reducerer overførsel; billeddimensioner/detaljegrad påvirker billedtakseringen. Der laves ét eksisterende AI-kald, ingen separat analyse og ingen automatisk genanalyse ved visning. Brug endpointets tokenstatistik til at måle faktiske omkostninger.

## Verifikation og udrulning

- `npm run build` kontrollerer Angular, prerendering og SEO.
- `node scripts/check-image-backend.mjs` tester den faktiske endpointkode med simulerede afhængigheder: abonnement, autorisation, projekt-/beskedkontrol, tekstkompatibilitet og redigerede fejllogs.
- `node scripts/check-project-images.mjs` tester faktisk Chromium IndexedDB/canvas: isolation, genindlæsning, atomisk kvote, optimering, sletning, kladdeoverførsel og payloadvalidering.
- Byg med `node_modules/.bin/ng build --configuration staging` og kør `node scripts/check-project-images-ui.mjs` for det samlede brugerforløb. Alle eksterne forbindelser er blokeret eller simuleret; Supabase-mocks accepterer kun testprojektet `woxioycjdjucxqiyqcyr`.
- Browsertests kræver en tilgængelig Playwright-installation. `PLAYWRIGHT_MODULE` kan pege på en eksisterende installation, og `IMAGE_TEST_BROWSER` kan angive en Chromium/Chrome-eksekverbar fil. Ingen nye appafhængigheder er tilføjet.

Edge Function skal deployes sammen med frontend. Denne implementering deployer ikke til produktion og foretager ingen databaseændringer. Eventuel live-backendtest skal udelukkende udføres i testprojektet `woxioycjdjucxqiyqcyr`.
