# Opgaveskabeloner og projekter uden AI

## Nyt projekt

Vælg Beskriv opgaven (AI), Brug en skabelon eller Start et tomt projekt.
De sidste to bruger ingen AI-forespørgsler og virker efter opbrugt prøveperiode.
Normal login-, medlemskabs- og blokeringskontrol gælder stadig.

## Manuelle linjer

Over tilbuddet findes Tilføj opgave og Tilføj materiale. Udfyld beskrivelse/fag
eller materialenavn/enhed og relevante tal. Tomme timer/priser kan udfyldes
senere i tilbuddet. Nye linjer kræver gennemgang og godkendelse.
Projektets timepris ændres under Rediger og gælder alle dets arbejdsopgaver.

## Gem og genbrug

Gem som skabelon lader dig vælge ikke-afviste opgaver og materialer og give
skabelonen et navn. Gemte felter er fag, opgavebeskrivelse og forventede timer
samt materialenavn, antal, enhed og enhedspris. Kundeoplysninger, projekttekst,
samtaler, projektets timepris og tilbudsbetingelser kopieres ikke. Hvis en
linjebeskrivelse selv indeholder kundedata eller en særlig aftale, skal den
redigeres inden lagring. En skabelon er et separat øjebliksbillede.

Alle aktive medlemmer af virksomheden kan bruge og slette dens skabeloner.
Indsæt skabelon tilføjer linjer; den overskriver ikke eksisterende linjer.
Nye projekter fra skabeloner bruger virksomhedens aktuelle standardtimepris.
Sletning af skabelonen ændrer ikke projekter, hvor den allerede er brugt.
Ret en skabelon ved at tilpasse projektets linjer og gemme en ny skabelon;
den første version har ikke særskilt redigering af en gemt skabelon.

## Teknik og kontrol

Migration: `supabase/migrations/202611080001_task_templates.sql`.
Tabellerne `task_templates` og `task_template_applications` har RLS og ingen
direkte browserrettigheder. RPC'er kontrollerer aktiv bruger og medlemskab.
Gem kopierer kun servervaliderede linjer fra det angivne projekt. Indsættelse
er atomisk og genforsøg med samme request-ID giver ikke dubletter. Nye
projektlinjer får nye ID'er, status suggested og værdikilde user, så ændringer
ikke uden videre overskrives af efterfølgende AI-svar.

`supabase/tests/task_templates.sql` bruger syntetiske data og rollback til at
kontrollere snapshots, isolering, idempotens, opbrugt prøveperiode og sletning.
Der foretages ingen OpenAI-kald i testen.

Aktiveret i den tilknyttede Supabase-database 8. november 2026. Rollback-testen
og en lokal browserkontrol med simuleret opbrugt prøveperiode er bestået.
Browserkontrollen dækkede tomt projekt, manuel opgave, lagring og indsættelse
af skabelon uden AI-kald; mobilvisningen blev også inspiceret.

Skabeloner er virksomhedsdata og følger med databasebackup. De slettes ved
sletning af virksomheden via foreign key cascade. Udlevering omfatter også
skabeloner; den lokale eksport-helper er opdateret hertil. Tabellen med
indsættelsesmarkører er teknisk metadata, ikke en genbrugelig skabelon.
