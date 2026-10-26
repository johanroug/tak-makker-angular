# Tjenester til Hovedet på sømmet

| Tjeneste | Bruges til |
|---|---|
| Resend | Sender bekræftelsesmails og mails til nulstilling af adgangskoder via Supabase. |
| Simply.com | DNS til hovedetpåsømmet.dk (hjemmeside) og hovedetpaasommet.dk (e-mail). |
| Punktum dk | Administrerer registreringen af de to .dk-domæner. |
| Vercel | Hoster hjemmesiden og gør Hovedet på sømmet tilgængelig på nettet. |
| Supabase | Leverer database, brugerlogin, adgangskontrol og serverfunktioner. |
| OpenAI | Leverer AI til at hjælpe med projekter og udarbejdelse af tilbud. |
| GitHub | Gemmer projektets kildekode og versionshistorik online. |
| Codex fra OpenAI | Hjælper med at udvikle, rette og vedligeholde projektets kode. |

## Sådan hænger det sammen

- **Hjemmeside:** hovedetpåsømmet.dk → DNS hos Simply → Vercel.
- **Brugere og data:** Hjemmesiden → Supabase.
- **Loginmails:** Supabase → Resend → brugerens indbakke. Afsenderdomænet er hovedetpaasommet.dk.
- **AI:** Supabases serverfunktion → OpenAI.

Oversigten dækker de tjenester og udviklingsværktøjer, vi har identificeret til projektet.

Johan har bekræftet opsætningen af de nye domæner hos Vercel, Resend og Supabase samt fungerende registrering, korrekt mailafsender og nulstillingslink. Status og resterende oprydning står i DOMAIN-SKIFTE.md.
