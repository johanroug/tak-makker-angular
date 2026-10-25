# Tjenester til Tak Makker

| Tjeneste | Bruges til |
|---|---|
| Resend | Sender bekræftelsesmails og mails til nulstilling af adgangskoder via Supabase. |
| Simply.com | Administrerer DNS-poster, der forbinder takmakker.dk med Vercel og Resend. |
| Punktum dk | Administrerer registreringen af .dk-domænet takmakker.dk. |
| Vercel | Hoster hjemmesiden og gør Tak Makker tilgængelig på nettet. |
| Supabase | Leverer database, brugerlogin, adgangskontrol og serverfunktioner. |
| OpenAI | Leverer AI til at hjælpe med projekter og udarbejdelse af tilbud. |
| GitHub | Gemmer projektets kildekode og versionshistorik online. |
| Codex fra OpenAI | Hjælper med at udvikle, rette og vedligeholde projektets kode. |

## Sådan hænger det sammen

- **Hjemmeside:** takmakker.dk → DNS hos Simply → Vercel.
- **Brugere og data:** Hjemmesiden → Supabase.
- **Loginmails:** Supabase → Resend → brugerens indbakke.
- **AI:** Supabases serverfunktion → OpenAI.

Oversigten dækker de tjenester og udviklingsværktøjer, vi har identificeret til projektet.
