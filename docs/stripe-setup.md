# Stripe-abonnement

Standard er 299 kr. ekskl. moms pr. virksomhed om måneden, med 200 gennemførte
AI-kald og 100 transskriptioner pr. betalt abonnementsperiode. Hver optagelse er
højst 90 sekunder (op til 150 minutters tale). Med dansk moms bliver det 373,75 kr.
Alle medarbejdere deler kvoten. Fejlede kald tæller ikke; reserverede kald optager
midlertidigt en plads. Ny periode giver ny kvote, uden overførsel af ubrugte kald.
Manuel `free`/`internal`-adgang bevares ved Stripe-opdateringer.

## Sandbox-opsætning

Produkt: `prod_VYxrv3AYBOjBuU`.
Pris: `price_1UXpvcICR38fRJAgTVVwlGBV`.

Gem følgende som Supabase Edge Function secrets, aldrig i Angular eller chat:

- `STRIPE_SECRET_KEY`: sandbox-nøglen, der starter med `sk_test_`.
- `STRIPE_PRICE_ID`: pris-id ovenfor.
- `STRIPE_WEBHOOK_SECRET`: destinationens signeringsnøgle, `whsec_...`.
- `STRIPE_TAX_RATE_ID`: id på en aktiv manuel dansk momssats, `txr_...`.

Opret en manuel tax rate i Stripe Product catalog → Tax rates: 25 %, Danmark
(`DK`), eksklusiv moms. Den globale indstilling "Include tax in prices: No"
opretter ikke i sig selv en momssats. Integrationen bruger denne manuelle sats;
automatisk Stripe Tax er ikke slået til. Dette flow er til danske CVR-virksomheder.
Udenlandske kunder kræver særskilt afklaring og implementering af momsregler.

Opret en webhook-destination i samme sandbox, med events fra egen konto:

`https://agbugdzobpkpgfischvi.supabase.co/functions/v1/stripe-webhook`

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Gem destinationens signing secret i `STRIPE_WEBHOOK_SECRET`. Checkout er spærret,
indtil alle fire indstillinger findes. Serveren kontrollerer desuden pris,
valuta, interval og momssats, før den opretter en betaling.

## Adgang og sikkerhed

Betalt adgang kræver en aktiv Stripe-subscription med betalt seneste faktura.
Webhooken verificerer signaturen på den rå body og henter derefter den aktuelle
subscription direkte fra Stripe. Gentagne og forsinkede events håndteres på
serveren. Browserens returadresse giver aldrig i sig selv betalt adgang.

Kundeportalen konfigureres automatisk til betalingskort, fakturahistorik og
opsigelse ved periodens udløb. Læsning af eksisterende projekter og PDF er fortsat
mulig efter kvotens udløb. De 10 gratis kald er en engangskvote; de nulstilles ikke.

Live-nøgler afvises, medmindre `STRIPE_ALLOW_LIVE=true` eksplicit sættes.
Live kræver egne produkt-, pris-, momssats- og webhookindstillinger samt godkendt
Stripe-konto. `APP_URL` kan sætte appens retur-origin; standard er produktionsdomænet.
Localhost på port 4200 accepteres også under udvikling.

## Kontrol og udrulning

Migration: `202611040001_stripe_subscriptions.sql`.
Funktioner: `billing-session`, `stripe-webhook` og `generate-offer`.
Migrationen og funktionerne er udrullet den 4. november 2026. Frontend skal lægges op.

Beståede kontroller: `scripts/check-stripe.mjs`, `scripts/check-billing.mjs`,
`scripts/check-ai-trade.mjs`, produktionsbuild og rollback-tests i
`supabase/tests/stripe_subscriptions.sql` og `supabase/tests/company_trial.sql`.

Johan har den 4. november gennemført sandbox-checkout med korrekt moms og
bekræftet aktiv adgang, 500-kvote, ét gennemført AI-kald og kundeportalen med
betalt faktura. Genaktivering er efterfølgende bekræftet automatisk i appen.
En simulering frem til december har oprettet faktura 0002 med Retrying, og appen
har modtaget betalingsfejlen. Oversigten viser nu Betaling mangler frem for
Gratis prøveperiode; eventuelle ubrugte prøvekald nævnes særskilt. Faktura 0002
er derefter betalt med 4242-kortet, og databasen har modtaget aktiv status for
4. december–4. januar. Appens server er stadig i november, så den fremtidige
periode giver endnu ikke betalt adgang i UI.

På en anden testkunde uden test-clock er et nyt abonnement startet med en
prøveperiode og afsluttet med `trial_end=now` og
`payment_behavior=allow_incomplete`. Kort 0341 har givet et afvist forsøg,
og appen har vist Betaling mangler. En efterfølgende testbetaling på 373,79 kr.
(373,75 kr. samt 0,04 kr. fra tidligere justering) er gennemført. Johan har
derefter bekræftet Aktivt abonnement og 500 tilbage i appen ved normal servertid.
Dette verificerer gendannet adgang efter betaling; en almindelig automatisk
månedlig fornyelse uden manuelle periodeændringer er ikke kontrolleret i browseren.

Testvejledning: flexible billing kan ændre perioder uden at oprette en faktura,
og reguleringer kan blive for små til et korttræk. Afslutning af en testprøveperiode
skal bruge eksplicit `payment_behavior=allow_incomplete`, hvis en afvist betaling
skal gemmes som udestående i stedet for at afbryde ændringen. Kontrollér altid
fakturaens beløb/status og abonnementets status; et charge-error alene er ikke nok.

Rollback-testen i stripe_subscriptions.sql består for past_due → active i en
aktuel periode: adgang gendannes, forbrug bevares, og nye kald tæller i betalt
kvote. Den kontrollerer også, at fremtidige perioder ikke aktiveres for tidligt.
Opsigelse til 4. december er bekræftet i Stripe. Koden håndterer
nu også `cancel_at` lig periodens slutdato; den eksisterende testvirksomheds
opsigelsesmarkering er rettet særskilt ud fra Stripes bekræftelse. Den rettede
webhook skal stadig kontrolleres med en ny opsigelse/genaktivering fra Stripe.

Brug en almindelig prøvevirksomhed i sandbox (intern adgang kan ikke købe):

1. Checkout skal vise 299 kr. + 74,75 kr. moms pr. måned.
2. Gennemfør en testbetaling, kontrollér webhook-levering og aktiv adgang med 500 kald.
3. Kontrollér fornyelse, mislykket betaling, opsigelse ved periodens udløb og genkøb.
4. Kontrollér kundeportal, faktura og uændret manuel intern adgang.

Ingen rigtige betalinger er oprettet under implementeringen.

## Før livebetaling

1. Gennemfør aktivering og virksomhedsverifikation i Stripe livekontoen.
2. Opret/kopiér produkt og månedlig pris til live: 299 DKK ekskl. moms. Opret
   aktiv dansk momssats på 25 % exclusive i live og kontrollér prisens tax behavior.
   Produktnavn: Hovedet på Sømmet — Standard. Beskrivelse: 200 AI-kald og 100
   transskriptioner pr. virksomhed pr. måned. Højst 90 sekunder pr. optagelse.
   Kontrollér teksten ved kopiering: den gamle sandboxbeskrivelse kan nævne 500 kald.
3. Opret live-webhook med samme URL og seks events som ovenfor. Brug den
   live-destinations egen signing secret.
4. Identificér og afvikl sandbox-kunder/abonnementer, og ryd deres Stripe-referencer
   i appens testvirksomheder kontrolleret før brug af live-nøglen. Sandbox-id'er
   virker ikke med live-nøgler. Slet ikke virksomheder, projekter eller manuelle
   adgangsundtagelser som del af betalingsoprydning. Finish simulation sletter
   de tilknyttede Stripe-testobjekter og kræver koordineret oprydning.
5. Deploy frontend. Opdatér server-secrets samlet til live-værdier:
   STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_TAX_RATE_ID og STRIPE_WEBHOOK_SECRET.
   Sæt først STRIPE_ALLOW_LIVE=true, når livebetaling skal aktiveres. Ingen nøgler
   gemmes i frontend eller repo. Sandbox-konfiguration kan ikke bruges til live.
6. Kontrollér live-checkout, beløb/moms, returadresse, webhook-levering og portal.
   En rigtig betaling kræver særskilt aftale; brug ikke testkort i live.
