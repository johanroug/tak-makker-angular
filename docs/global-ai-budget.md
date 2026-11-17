# Globalt AI-budget

Fælles budget for `generate-offer` (inklusive billeder) og `transcribe-audio`:

- 10 kr. pr. kalenderdag og 100 kr. pr. kalendermåned, dansk tid.
- Gælder også prøvebrugere samt `free` og `internal`.
- Beløb er eksklusive moms og gemmes som heltal i mikro-DKK (1 kr. = 1.000.000).
- Kundernes eksisterende kvoter fortsætter uafhængigt af dette budget.

## Reservation og afregning

Før hvert OpenAI-kald reserveres 3 kr. under en fælles PostgreSQL-rækkelås.
Budgettet skal kunne rumme hele reservationen i både dag og måned; ellers
returneres HTTP 503 med `AI_BUDGET_REACHED`. Derfor kan tjenesten stoppe, selv
om der er mindre end 3 kr. tilbage. Manglende indstillinger eller databasefejl
stopper også kaldet. Browseren kan hverken reservere, afregne eller ændre budgettet.

Efter svar afregnes de rapporterede tokens konservativt. Tilbud bruger højeste
relevante lange-kontekst/cache-write-inputpris ($0,25/million) og outputpris
($0,75/million), USD/DKK 8 og 10 % margin for regional behandling. Cache giver
ingen rabat i budgetregnskabet. Output omfatter reasoningtokens. Tilbud sendes
med `service_tier: default`; der er ingen betalte værktøjer eller SDK-retries.
Transskription afregnes konservativt med $5/million for alle input/outputtokens,
samme valutakurs og margin. En reservation på 3 kr. dækker de dokumenterede
modelgrænser for de tilladte modeller. Modeller og priser skal revurderes ved
leverandørændringer; dette er et internt sikkerhedsregnskab, ikke en faktura.

Hvis svar mangler tokenforbrug, parsing fejler, processen afbrydes, afregning
fejler eller kaldet får timeout, beholdes alle 3 kr. Reservationer udløber ikke
automatisk. Et request, der med sikkerhed ikke er sendt, kan frigives. Hvis
rapporteret pris mod forventning overskrider reservationen, registreres beløbet
og nødstop aktiveres for efterfølgende kald. Allerede sendte kald kan ikke
tilbagekaldes. Periode beregnes på reservationstidspunktet; afregning af et
gammelt kald ændrer det oprindelige dags-/månedsregnskab.

Budgettet beskytter disse to funktioner, ikke andre tjenester med samme API-nøgle,
historisk forbrug før aktivering, fremtidige prisændringer eller valuta over den
valgte sikkerhedskurs. OpenAI-kontoens egne forbrugsindstillinger er et separat lag.
`OPENAI_TRANSCRIPTION_MODEL` skal være tom eller `gpt-4o-mini-transcribe`;
andre overrides afvises, indtil deres pris er understøttet.

Kilder kontrolleret 17. november 2026:
[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna),
[GPT-4o Mini Transcribe](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe).

## Drift og aktivering

1. Anvend `supabase/migrations/202611170001_global_ai_budget.sql`.
2. Anvend også `supabase/migrations/202611170002_offer_request_guard.sql`, og deploy begge Edge Functions med den fælles `budget.ts`.
3. Deploy frontend for den venlige pausebesked ved tilbudskald.

Indstillingerne starter med ovenstående grænser og `enabled=true`. Regnskabet
starter ved aktivering; tidligere AI-kald importeres ikke. Gamle deployede
funktioner omgår det nye budget, så begge endpoints skal opdateres.

## Administrator: ændr budget uden deployment

En administrator med adgang til Supabase-projektets SQL Editor kan ændre
begge beløb. Budgetkontrollen læser indstillingerne fra databasen ved hvert
nyt kald; ændringen gælder, når transaktionen er gemt. Der er ingen cache,
genstart eller deployment. Der er endnu ingen budgetformular i selve appen.
Almindelige appbrugere har ikke rettigheder til at ændre indstillingerne.

Angiv beløbene i kroner i udtrykkene nedenfor (her de valgte 10 og 100 kr.):

```sql
update public.ai_budget_settings
set daily_limit = 10 * 1000000,
    monthly_limit = 100 * 1000000
where id=true
returning daily_limit/1000000.0 as daily_dkk,
          monthly_limit/1000000.0 as monthly_dkk;
```

Ændring af grænser nulstiller ikke forbruget og ændrer ikke det manuelle
nødstop. Sænkes et budget under det beløb, der allerede er brugt/reserveret,
afvises nye kald. Hæves det igen, kan nye kald fortsætte, når der er plads til
en reservation, forudsat at `enabled=true`. Allerede sendte kald fortsætter.
0 kr. stopper nye kald. Negative beløb afvises af databasen.

Manuelt nødstop i Supabase SQL Editor:

```sql
update public.ai_budget_settings set enabled=false where id=true;
```

Genåbn (dag-/månedsbudget gælder fortsat):

```sql
update public.ai_budget_settings set enabled=true where id=true;
```

Se grænser og forbrug:

```sql
select enabled, daily_limit/1000000.0 as daily_dkk,
  monthly_limit/1000000.0 as monthly_dkk
from public.ai_budget_settings;

select budget_day, kind, count(*) as attempts,
  sum(charged_amount)/1000000.0 as charged_or_reserved_dkk,
  count(*) filter(where not settled) as unresolved
from public.ai_budget_requests
group by budget_day,kind order by budget_day desc,kind;
```

Undersøg uafklarede reservationer mod leverandørens forbrug, før de eventuelt
justeres administrativt; nulstil ikke automatisk ved fejl. Ledgeren skal bevares
for hele den aktuelle måned. Ændring af grænser sker kun via SQL Editor/backend.

## Kontrol

Se også [beskyttelse mod gentagne tilbudskald](offer-request-protection.md).

- `node scripts/check-ai-budget.mjs`: migration i isoleret PGlite/PostgreSQL,
  budgetgrænser, rettigheder, fælles reservationer, afregning, periodeskift,
  nødstop, manglende konfiguration og transskriptionsendpointet med mocks.
- `node scripts/check-image-backend.mjs`: tilbudsendpointet, herunder globalt
  stop for aktive, interne og prøvekonti samt fejl i budgetkontrollen.
- `node scripts/check-speech-access.mjs`: eksisterende adgangsregler.

PGlite-testen bruger den eksisterende isolerede installation under
`tmp/customer-db-test/node_modules`. Den kalder hverken Supabase eller OpenAI.
