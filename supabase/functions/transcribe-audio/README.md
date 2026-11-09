# Taleinput

Bruges af samtalen og oprettelse af projekter. Browseren optager højst 90 sekunder og sender en multipart-lydfil til denne funktion. Teksten indsættes i feltet til gennemlæsning; tilbudsforespørgslen sendes separat.

## Opsætning

1. Anvend migrationen `202611090001_speech_upload_limit.sql`.
2. Deploy funktionen: `npx supabase functions deploy transcribe-audio`.
3. Funktionen bruger den eksisterende `OPENAI_API_KEY` i Supabase Secrets. Nøglen skal aldrig ligge i klienten.
4. Valgfri secret `OPENAI_TRANSCRIPTION_MODEL` ændrer standardmodellen `gpt-4o-mini-transcribe`.

Modellen og multipart-endpointet følger https://developers.openai.com/api/docs/guides/speech-to-text.

Adgang kræver en gyldig bruger, appadgang, virksomhedsmedlemskab og resterende transskriptioner. Standard indeholder 200 AI-kald og 100 transskriptioner pr. virksomhed pr. abonnementsperiode; prøveperioden indeholder 10 af hver. Intern og fri adgang har ingen månedlig kvote. Hver bruger kan sende højst 30 lydfiler i timen, hver på højst 8 MB. Browseren stopper optagelsen efter 90 sekunder (100 optagelser giver højst 150 minutters optagetid). Taleinput bruger ikke i sig selv et tilbudskald. Kun vellykkede transskriptioner tæller; samtidige uploads reserverer pladser i kvoten. Lyd gemmes ikke i database, Storage eller applikationslogs. OpenAI behandler lyden efter leverandørens gældende datavilkår.

Anvend også migrationen `202611090002_standard_usage_limits.sql`, før den nye funktionsversion deployes.

## Manuel gennemgang

- Optag og stop i samtalen og i Nyt projekt; kontrollér at teksten føjes til eksisterende tekst uden automatisk afsendelse.
- Kontrollér mikrofontilladelse, afvist tilladelse, annullering, lukning af dialogen og projekt-/faneskift.
- Kontrollér på iPhone/Safari og desktop, herunder automatisk stop efter 90 sekunder.
- Kontrollér at opbrugt kvote afviser taleinput, og at en bruger uden adgang ikke kan kalde endpointet.
