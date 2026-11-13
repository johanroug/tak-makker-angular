# Gendannelse til hovedet-test

Mål verificeret via Supabase-projektlisten: `hovedet-test`, reference
`woxioycjdjucxqiyqcyr`, PostgreSQL 17, region `eu-west-1`.
Johan har bekræftet Session pooler-host:
`aws-1-eu-west-1.pooler.supabase.com`.
Produktionsreferencen er `agbugdzobpkpgfischvi` og anvendes aldrig som
databaseforbindelse af det nye testværktøj.

## Første næste trin

Opret environment secret **SUPABASE_TEST_DB_PASSWORD** i GitHub under:
Settings → Environments → simply-production → Add environment secret.
Værdien er den databaseadgangskode, der blev valgt ved oprettelse af
hovedet-test. Ingen adgangskoder skal sendes i chatten, committes eller sættes
i workflow-inputs. De eksisterende fire krypterings-/SSH-secrets genbruges.
Produktionsdatabasens adgangskode er ikke tilgængelig for workflow-steppet.

## Publicering uden at deploye kundekartoteket

**Push til main udløser automatisk deploy af webappen.** Det er derfor forkert
at committe/pushe alle de aktuelle staged ændringer nu.

Publicér kun disse nye filer samt deres to allerede-eksisterende afhængigheder,
hvis de ikke allerede findes på main:

- `.github/workflows/restore-supabase-test-project.yml`
- `scripts/restore-supabase-test-project.sh`
- `scripts/build-hosted-test-restore.mjs`
- `scripts/build-hosted-test-restore.test.mjs`
- `docs/hosted-test-restore.md`
- Eksisterende afhængigheder: `scripts/check-restored-row-counts.mjs` og
  `scripts/prepare-restore-data.mjs`.

Brug en særskilt, gennemgået commit på main med `[skip ci]` i commitbeskeden,
så push-workflowet ikke deployer. GitHubs skip-markør stopper push-workflows;
den manuelle workflow_dispatch kan efterfølgende køres. Bevar de øvrige staged
ændringer og lad kundekartoteket blive lokalt. Der er endnu ikke lavet commit
eller push som del af forberedelsen.

## Kørsel

1. Kør **Restore backup into hovedet-test** fra GitHub Actions på main.
2. Angiv det eksakte arkivnavn, som blev testet før kundemigrationen:
   `supabase-20261113T094328Z-43403543491-1.tar.gz.gpg`.
3. Angiv bekræftelsen `RESTORE hovedet-test`.
4. Workflowet downloader/dekrypterer arkivet og gendanner skema og data i én
   transaktion. Det afviser et mål med eksisterende app-tabeller, Auth-brugere
   eller Storage-buckets/objekter. Der køres ingen DROP eller TRUNCATE.
5. Alle importerede COPY-tabellers rækkeantal kontrolleres før COMMIT.
   Kundemigrationen bliver **ikke** anvendt i dette første trin.
6. Når baseline-gendannelsen er bestået, kan vi køre og kontrollere
   kundemigrationen specifikt i testprojektet. Repositoryets eksisterende
   Supabase-link forbliver rettet mod produktion og ændres ikke af workflowet;
   brug det derfor ikke med `--linked` til testmigrationen.

Hvis workflowet består, vil en ny gendannelse til samme testprojekt blive afvist,
fordi projektet nu indeholder data. Der er ingen automatisk nulstilling.

## Afgrænsning og hosted-kompatibilitet

Dette er et testværktøj til et nyt hosted Supabase-projekt. Målreference,
pooler-host og postgres-brugernavn er fastlåst i scriptet. Ingen produktions-DB
kontaktes. Læsning af produktionsbackup sker kun fra Simplys private arkivmappe.

Hosted Supabase stiller sine egne administrerede roller til rådighed;
`roles.sql` eksekveres ikke. Egne roller og særlige rolleindstillinger kræver
særskilt gennemgang. Hvis skemaet bruger manglende egne roller, fejler
gendannelsen i stedet for at fjerne rettigheder eller policies.
Kun `ALTER … OWNER TO supabase_admin` udelades fra den midlertidige skemakopi,
som beskrevet i Supabases hosted restore-vejledning. Antallet logges.
Andre rettighedsproblemer medfører fejl; ingen generel rettighedsomskrivning.

Manglende Storage-tabeller må kun udelades, hvis arkivet indeholder præcis nul
rækker. Manglende Auth-tabeller eller Storage-tabeller med data fejler testen.
Det originale krypterede arkiv ændres aldrig. Storage-filer, Edge Functions,
dashboardindstillinger og eventuelle Vault/pgsodium-rootnøgler følger ikke med.
Tilpassede Auth/Storage-triggere og policies skal verificeres særskilt mod
produktionen, fordi administrerede skemadefinitioner ikke nødvendigvis er i
dumpet. Dette er ikke en komplet projektkloning.

Der uploades ingen plaintext-filer eller artifacts. SQL-fejl i Actions vises
kun som SQLSTATE; COPY-fejl kan ellers afsløre persondata. Ved mistet forbindelse
under COMMIT skal måltilstanden kontrolleres før et nyt forsøg.
Den kopierede database indeholder rigtige kundedata og brugere. Deploy ikke
produktionsnøgler til Stripe eller produktions-webhooks i testprojektet.
