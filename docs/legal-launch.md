# Betingelser og privatliv — 7. november 2026

Offentlige sider: /handelsbetingelser, /privatlivspolitik, /kontakt.
Adresse og juridisk navn er bekræftet af Johan. CVR: 46908171, oplyst af Johan 12. november 2026;
betalingsfunktionerne er fortsat lukket på offentlige origins i sandbox.
Siderne beskriver det planlagte B2B-abonnement særskilt fra gratis prøveadgang.
Der er links ved oprettelse, i den offentlige footer og i arbejdsrummet.
Oprettelsesteksten er information, ikke et særskilt GDPR-samtykke.

## Før betalende kunder og almindelige persondata i kunders projekter

- CVR 46908171 er tilføjet. Kontrollér momsregistrering før Stripe Live.
- Udkastet til kundernes databehandleraftale ligger i
  `docs/databehandleraftale-udkast.md`. Færdiggør bilag og indgå aftalen.
  Privatlivspolitikken er ikke den aftale. Brug anonymiserede testopgaver indtil da.
- Kontrollér konkrete databehandleraftaler, underdatabehandlere og
  overførselsgrundlag hos Supabase, OpenAI, Simply, GitHub og Stripe.
  En offentlig GDPR-side beviser ikke, at den relevante aftale er indgået.
- Johan har godkendt 30 dage for appens aktivitetslogs og egne backupfiler.
  Dagligt backupjob rydder aktivitetslogs op før dump og egne arkiver efter
  verificeret upload. Johan har bekræftet merge til main og en vellykket kørsel
  7. november 2026.
  Konto-/projektsletning er en manuel supportprocedure, ikke automatisk ved
  abonnementsophør. Frist: inden 30 dage efter bekræftet anmodning.
  Se `docs/data-deletion.md`. Simplys egne backupkopier kan overleve vores
  arkiver yderligere cirka 30 dage; politikken beskriver den forskel.
- Gentag relevante sletninger, hvis en gammel backup gendannes. Backup- og
  restorejobs behandler data på GitHub-hostede runners; alt foregår ikke i EU.
- Manuel eksport af virksomhedens produktdata: `.local-tools/export-company.sql`,
  arbejdsgang og afgrænsning i `.local-tools/company-export.md`. Syntetisk kontrol og
  kontrol af rækkeantal/virksomhedsafgrænsning mod aktuel database er bestået
  7. november 2026. En lokal JSON-eksport af Johans egen virksomhed er også gemt
  og verificeret med Windows-wrapperen `.local-tools/export-company.ps1`. Sikker
  modtagerlevering mangler fortsat før første udlevering. Ingen offentlig
  eksportfunktion er tilføjet.
- OpenAI: brugerens skærmbillede viser alle tre Sharing-valg som Disabled.
  Responses-kaldet angiver nu `store: false`. Samtaler gemmes fortsat i Supabase
  og sendes med som kontekst. Dette er ikke Zero Data Retention, ændrer ikke
  nødvendigvis sikkerhedslogning/caching og sletter ikke tidligere lagrede svar.
  Koden sender fortsat projektkontekst med kundedata til OpenAI.
  Der gives ingen ubetinget garanti om træning, lagring eller EU-behandling.

## Leverandørstatus bekræftet af Johan

- Loginmails er skiftet fra Resend til Simply SMTP 7. november 2026.
  system@hovedetpaasommet.dk er testet ved både oprettelse og nulstilling
  med efterfølgende login. Johan har bekræftet fjernelse af Resend-nøglen,
  Resend-domænet, konto og de tre tilhørende DNS-records. Tidspunktet for
  leverandørens sletning af historiske leveringsdata er ikke dokumenteret.

- GitHub: Ny Free-organisation oprettet; Settings viser Corporate (GitHub
  Customer Agreement). Supportsag sendt om DPA-dækning for GitHub-hostede
  Actions-runners med midlertidige persondata i backup og restoretest.
  Svar og overførselsgrundlag afventer. Repository og jobs er endnu ikke
  flyttet; den nye organisations aftale må ikke regnes som dækning af de
  eksisterende kørsler på den personlige konto. Ingen betalt plan er bestilt.

- Simply DPA 1.8: status Underskrevet i kontrolpanelet den 7. november 2026,
  vist klokkeslæt 13:25:59, kontoejer Johan Steiner Roug. Johan har gemt
  bekræftelsen og aftaledokumenterne.
- Supabase: Legal Documents oplyser, at DPA indgår i Terms of Service uden
  særskilt underskrift. Johan har gemt DPA og TIA. Overførselsvurderingen skal
  stadig gennemgås; download alene dokumenterer ikke tilstrækkelig beskyttelse.
- OpenAI: Johan har gemt den offentlige DPA. Den aftale, der gælder for den
  konkrete API-konto, og overførselsgrundlaget skal fortsat være dokumenteret.
- Ved betalt køb: vis vilkår før bestilling og gem version/tidspunkt for accept.

## Kilder

- https://forbrugerombudsmanden.dk/alle-emner/anden-lovgivning/e-handelsloven
- https://www.datatilsynet.dk/Media/C/0/Registreredes%20rettigheder.pdf
- https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- https://developers.openai.com/api/docs/guides/your-data

Der er ikke foretaget ekstern juridisk gennemgang. De konkrete drifts- og
aftalepunkter ovenfor skal afklares før betalt lancering og almindelig
behandling af kundevirksomhedernes personoplysninger.
