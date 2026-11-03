# Giv en virksomhed fri adgang i Supabase

Åbn **Table Editor → public.company_billing** og find virksomhedens række.
Feltet `company_id` svarer til `id` i tabellen `companies`, hvor du kan finde
virksomheden ud fra navn eller CVR.

Ret `ai_access_override`, og gem:

| Værdi | Virkning |
| --- | --- |
| `none` | Normal prøveperiode og eventuelt betalt abonnement |
| `free` | Fri adgang uden forbrugsgrænse; vises som “Fri adgang” |
| `internal` | Fri adgang til intern brug; vises som “Intern adgang” |

Ret kun dette felt for at give fri adgang. Det er uafhængigt af
`subscription_status` og `access_until`, som vedrører betalte abonnementer.
Almindelige brugere kan ikke ændre indstillingen.

Appen henter status igen ved fokus og hvert minut, mens fanen er synlig.
Du kan også genindlæse siden efter ændringen. Din egen virksomhed er allerede sat til
`internal`. Den nye frontend skal være lagt op for at vise de nye adgangstekster.

Fri adgang gælder hele virksomheden. Nye kald tæller ikke i prøveperioden.
Tidligere prøveforbrug bevares, så det gælder igen, hvis du sætter feltet til
`none`. En eksisterende brugerblokering gælder også ved fri adgang.

## Hvis virksomheden ikke har en række endnu

Rækken oprettes normalt ved første forespørgsel. Du kan også give adgang før
første kald i **SQL Editor**. Erstat `VIRKSOMHEDENS_UUID` med `companies.id`:

```sql
insert into public.company_billing (company_id, ai_access_override)
values ('VIRKSOMHEDENS_UUID'::uuid, 'free')
on conflict (company_id) do update
set ai_access_override = excluded.ai_access_override;
```

Denne kommando bevarer øvrige abonnementsoplysninger og historisk forbrug.
