# Skift loginmails fra Resend til Simply

Status: **Simply er aktiv mailleverandør fra 7. november 2026.** Johan har
oprettet systemkontoen, gemt SMTP-oplysningerne i Supabase og bekræftet både
nulstilling med efterfølgende login og en ny brugers bekræftelse/login.
Bekræftelsesmailen til firmaadressen var forsinket, men kom frem.
Resends API-nøgler, historiske data og DNS-poster er endnu ikke afviklet.

## Ny mailkonto

Opret en rigtig mailkonto hos Simply på `hovedetpaasommet.dk`:
`system@hovedetpaasommet.dk`. En videresendelse alene har ikke et selvstændigt
SMTP-login. Brug en særskilt adgangskode gemt i en passwordmanager, aldrig i
chat, kode eller Git. Kontoen skal kunne modtage eventuelle svar; følg med i
indbakken eller opsæt en kopi til den overvågede virksomhedsmail.

## Supabase Auth — Custom SMTP

| Felt | Værdi |
| --- | --- |
| Sender email | system@hovedetpaasommet.dk |
| Sender name | Hovedet på sømmet |
| Host | smtp.simply.com |
| Port | 587 (STARTTLS) |
| Username | system@hovedetpaasommet.dk |
| Password | Den nye mailkontos adgangskode, indtastes kun i Supabase |

Supabase Auth understøtter ekstern SMTP. Der skal ikke ændres i Angular eller
Edge Functions, da mails allerede sendes af Supabase Auth. Bevar e-mail-
bekræftelse, skabeloner, Site URL og redirect-allowlist. Brug ikke den lokale
Simply-webserver-relay `websmtp.simply.com`: afsendelsen kommer fra Supabase.

MX, Simply SPF, Simply DKIM og DMARC er allerede opsat fra virksomhedsmailens
opsætning. Kontrollér dem ved testen, men nulstil ikke DNS og tilføj ikke en
ekstra SPF-post ved siden af den eksisterende. Resends særlige DNS-poster
bevares indtil testen er bestået.

## Test og afslutning

1. Brugeren ændrer SMTP-oplysningerne i dashboardet og gemmer.
2. Brugeren opretter en ny testkonto med en e-mailadresse, vedkommende selv
   kontrollerer. Kontrollér modtagelse, afsender, eventuel spam og at linket
   lander på det rigtige domæne og bekræfter kontoen.
3. Brugeren tester Glemt adgangskode på en egen testkonto og gennemfører
   nulstillingen. Test ikke ved at ændre adgangskoden på en kunde-/administratorkonto.
4. Kontrollér Authentication logs i Supabase og mail-loggen hos Simply ved fejl.
   Kontrollér SPF/DKIM/DMARC-resultater i modtagerens mailheaders.
5. Først efter beståede tests: opdatér privatlivspolitik, kundeaftaleudkast og
   tjenesteoversigter, så Resend ikke længere står som aktiv mailleverandør.
6. Kontrollér, om andre integrationer bruger Resend, før API-nøgler tilbagekaldes,
   sending-domænet fjernes eller kontoen afsluttes. Dokumentér eventuelle
   resterende historiske data hos Resend. Afslutning af SMTP-integrationen er
   ikke i sig selv dokumentation for, at historiske mails/logs er slettet.

Ved leveringsfejl kan de tidligere Resend-SMTP-indstillinger genindsættes,
så længe den gamle nøgle stadig er gyldig. Gem ikke nøglen i dette dokument.

## Officielle kilder

- https://www.simply.com/dk/support/faq/mail/774-opsaetning-af-mail-i-spark/
- https://www.simply.com/dk/support/faq/mail/91-problemer-med-at-sende-igennem-smtp-simply-com/
- https://supabase.com/docs/guides/auth/auth-smtp
