# Tjenester til Hovedet på sømmet

| Tjeneste | Bruges til |
|---|---|
| Simply.com | Hjemmeside, DNS, virksomhedsmail, loginmails via SMTP og krypterede databasebackups. |
| Punktum dk | Administrerer registreringen af de to .dk-domæner. |
| Supabase | Leverer database, brugerlogin, adgangskontrol og serverfunktioner. |
| OpenAI | Leverer AI til at hjælpe med projekter og udarbejdelse af tilbud. |
| GitHub | Kildekode, automatisk udgivelse fra main samt backup- og gendannelsesjobs. |
| Codex fra OpenAI | Hjælper med at udvikle, rette og vedligeholde projektets kode. |
| Stripe | Håndterer betalinger. |

## Sådan hænger det sammen

- **Hjemmeside:** hovedetpåsømmet.dk → DNS og webhotel hos Simply. GitHub Actions udgiver fra main.
- **Brugere og data:** Hjemmesiden → Supabase.
- **Loginmails:** Supabase → Simply SMTP → brugerens indbakke. Afsender: system@hovedetpaasommet.dk.
- **AI:** Supabases serverfunktion → OpenAI.

Oversigten dækker de tjenester og udviklingsværktøjer, vi har identificeret til projektet.

Vercel-projektet er slettet. Resend er erstattet af Simply SMTP; oprettelse,
bekræftelse, nulstilling og efterfølgende login er bekræftet af Johan den
7. november 2026. Afvikling af Resend-nøgler, historiske data og DNS afventer.
Se docs/smtp-simply.md. Ældre domæneskifthistorik står i DOMAIN-SKIFTE.md.
