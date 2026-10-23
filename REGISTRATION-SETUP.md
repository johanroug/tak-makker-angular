# Brugerregistrering og blokering

## Udrulning

1. Kør `supabase/migrations/202610230006_registration_and_access.sql` i Supabase SQL Editor. Den forudsætter de eksisterende migrationsfiler, herunder aktivitet og den nye bruger/virksomhed-funktion.
2. Kør `supabase/tests/user_blocking.sql` i SQL Editor. Der skal findes en aktiv testbruger ud over administratoren. Alle testændringer rulles tilbage ved succes. Hvis SQL Editor viser en afbrudt transaktion efter en fejl, kør `rollback;`.
3. I Supabase Auth: tillad nye registreringer og kontrollér Email-providerens indstillinger. Behold e-mailbekræftelse slået til, når eksterne brugere registrerer sig.
4. Auth → URL Configuration: Site URL `https://www.takmakker.dk`. Tilføj Redirect URLs `https://www.takmakker.dk/login` og `http://localhost:4200/login`. Tilføj andre konkrete udviklingsdomæner, hvis de bruges.
5. Kontrollér SMTP/mailafsendelse, så bekræftelsesmail kan sendes til eksterne testbrugere. Supabases indbyggede mailtjeneste har begrænsninger; se den officielle guide nedenfor.
6. Deploy `generate-offer` i Supabase efter SQL. Funktionen kontrollerer nu appadgang før projektopslag og AI. Ingen ny secret er nødvendig.
7. Commit/push frontendændringerne til Vercel efter SQL.

## Godkendelse af nye brugere

Kør `supabase/migrations/202610230007_user_approval.sql` og derefter `supabase/tests/user_approval.sql`. Eksisterende brugere får en godkendelsespost ved migrationen; eksisterende blokeringer bevares. Nye konti har ingen godkendelsespost og får først adgang efter Godkend bruger under /users. Kør SQL før frontend-deployment.

## Appflow

- `/register`: e-mail, adgangskode og gentagelse. Ved krav om e-mailbekræftelse vises en besked; hvis Supabase returnerer en session, logges den ud, og brugeren får besked om at afvente godkendelse.
- Registreringen sætter ikke virksomhed eller administratorstatus fra brugerens metadata. Den eksisterende `ensure_current_company` opretter kun brugerens egen virksomhed ved første brug efter godkendelse.
- `/users`: kun samme administrator som Aktivitet. Søg, godkend, bloker og åbn adgang. Administratoren kan ikke blokere sig selv.
- Blokering er en appblokering, ikke sletning eller ændring af Supabase Auth-password. Serverkontrol, restriktive RLS-politikker og beskyttede RPC'er afviser efterfølgende databasekald med en eksisterende session. Allerede indlæst indhold eller igangværende requests kan ikke trækkes tilbage.
- Appen kontrollerer adgang ved login/routeskift samt ved fokus og hvert minut, mens fanen er synlig. Bekræftet blokering sender brugeren til login. Genåbning gør det muligt at logge ind igen.

## Manuel kontrol

- Registrér en ny testbruger via localhost og via produktion; kontrollér mail og afventende-status. Log ind som administrator og godkend brugeren; kontrollér derefter login, egen virksomhedsprofil og nyt projekt.
- Som ejer: kontrollér Brugere-menu og at administratoren ikke kan blokeres.
- Med testbrugeren allerede logget ind: bloker fra ejerens konto i en anden browser. Kontrollér tabellæsning, projektskrivning, færdiggørelse og AI-afvisning, også før JWT-udløb.
- Genåbn adgangen og kontrollér login og uændrede data.
- Som almindelig bruger: direkte `/users`, `get_app_users` og `set_app_user_blocked` skal afvises. Kør også de tidligere firma-isolationstests igen.

SQL og Supabase-indstillinger er ikke ændret automatisk af Codex.

Officielle kilder: https://supabase.com/docs/guides/auth/passwords og https://www.postgresql.org/docs/current/sql-createpolicy.html
