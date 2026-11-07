# Opbevaring og sletning

Godkendt af Johan 7. november 2026: 30 dage for app-aktivitetslogs og egne
backupfiler. Projekter bevares ved almindelig opsigelse, indtil kunden beder
om sletning. Aktive data slettes manuelt inden 30 dage efter en bekræftet
anmodning, med relevante retlige undtagelser.

## Automatisk daglig oprydning

GitHub Actions `Backup Supabase to Simply` starter normalt 02:23 UTC.
`scripts/prune-activity.sql` sletter kun aktivitetslogs mindst 30 dage gamle
før dump. Billing-/AI-forbrugsregistreringer slettes ikke: trial-forbrug skal
fortsat kunne beregnes, og betaling har egne dokumentationskrav.

Efter upload, checksum og rename kører `scripts/prune-simply-backups.sh`.
Den kontrollerer den faktiske mappe mod
`/var/www/hovedetpaasommet.dk/private-backups`, afviser symlinks, bevarer
den aktuelle verificerede backup og sletter kun komplette filer med det
forventede navn og en UTC-dato mindst 30 dage tilbage. Ingen rekursiv sletning.
Urelaterede filer og `.part`-filer kræver separat manuel vurdering.

Ved jobfejl: følg op samme dag; slet ikke den eneste brugbare backup uden en
konkret beslutning. Cron kan forsinkes. Politikken er ikke en garanti for,
at leverandørers separate logs eller sikkerhedsbackups har samme udløb.

## Manuel sletteanmodning — supportprocedure

1. Modtag anmodningen på kontakt@hovedetpaasommet.dk. Registrér modtagelsesdato,
   kontakt, omfang og seneste frist i en beskyttet administrativ oversigt.
   Bevar kun de nødvendige oplysninger til at gennemføre og dokumentere sagen.
2. Bekræft identitet og bemyndigelse. Skeln mellem en personlig brugerkonto og
   hele virksomhedens data. Slet ikke fælles projekter efter en enkelt brugers
   anmodning uden at afklare virksomhedens instruks.
3. Tilbyd udlevering før sletning. PDF'er alene er ikke nødvendigvis alle data;
   udlever relevante projekt-, kunde- og samtaleoplysninger sikkert som JSON/CSV.
4. Afklar aktive Stripe-abonnementer, fælles medlemskaber, lovpligtige
   regnskabsoplysninger, retskrav og eventuelle Storage-filer. En databasesletning
   opsiger ikke Stripe og fjerner ikke automatisk leverandørkopier.
5. Foretag en konkret afhængighedskontrol i Supabase før en målrettet transaktion.
   Verificér ejerskab, medlemskaber, projekter, tilbud, beskeder, materialer,
   aktivitetslogs, AI-registreringer og Auth-bruger. Brug aldrig en generel
   Auth-sletning som garanti for, at alt er væk. Ingen generisk massesletning
   er automatiseret med denne ændring.
6. Kontrollér resultatet, og bekræft over for anmoderen, hvilke aktive data der
   er slettet, og hvad der eventuelt bevares med begrundelse og opbevaringskriterium.
7. Notér minimalt nødvendige slettede bruger-/virksomhedsidentifikatorer og
   dato i den beskyttede administrative oversigt, så sletningen kan gentages
   ved gendannelse. Kopiér ikke indholdet af de slettede projekter til oversigten.
   Revurdér og fjern denne dokumentation, når backup- og dokumentationsbehov ophører.

## Backupkopier og gendannelse

En gammel egen backup kan indeholde data i op til cirka 30 dage efter aktiv
sletning. Simply kan have en egen webhotelbackup af denne fil i yderligere
cirka 30 dage, altså samlet cirka 60 dage efter aktiv sletning. Anmoder kunden
om sletning, kan den aktive sletteperiode på op til 30 dage ligge forud for
denne periode. Oplys forskellen; lov ikke, at samtlige kopier er væk 30 dage
efter den første henvendelse.

Ved gendannelse må kopi med tidligere slettede data ikke sættes i almindelig
drift, før sletningerne er gentaget. Det kræver den beskyttede oversigt og en
manuel kontrol; den eksisterende restoretest er ikke automatisk production
failover eller automatisk gennemførelse af tidligere sletteanmodninger.
