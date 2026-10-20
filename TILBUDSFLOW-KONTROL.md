# Kontrol af hele tilbudsflowet

Status 20. oktober 2026: Johan har bekræftet nedenstående samlede appkontrol mod sit Supabase-miljø. Lokale kontroller er også bestået med simuleret database og browser. Ingen nye spec-filer er oprettet.

## 1. Nyt projekt og første AI-besked

Opret et nyt testprojekt, og send fx:

> Kunden er Testkunde på Testvej 1, 8000 Aarhus C. Opgaven er maling af en indvendig væg. Foreslå en maleropgave og maling som materiale. Stil spørgsmål, hvis der mangler oplysninger.

Besvar eventuelle spørgsmål. Kontrollér, at beskeder, kundeoplysninger, projekttekst og forslag vises. Genindlæs siden og kontrollér, at de stadig er der. Projektets tilbudsvisning skal vise Kladde.

## 2. Ret, gem og vælg indhold

Ret en opgave til 2 timer. Ret et materiale til 3 liter à 100 kr. Sørg for, at opgaven har fag og beskrivelse, og at materialet har navn, beskrivelse og enhed. Acceptér de to linjer, og afvis eventuelle andre forslag. Gem kunde, adresse og projekttekst, hvis de mangler.

Genindlæs. Kontrollér værdier og valg igen. Udfyldte virksomhedsoplysninger er en forudsætning for færdiggørelse.

## 3. Kontrollér priser

Med projektets timepris H skal tilbuddet vise:

- Arbejde: 2 × H.
- Materialer: 300 kr.
- Subtotal: 2 × H + 300 kr.
- Moms: 25 % af subtotalen.
- I alt: subtotal + moms.

Ved H = 500 kr. er subtotalen 1.300 kr., momsen 325 kr. og totalen 1.625 kr. Afviste og øvrige ikke-accepterede forslag må ikke tælle med.

## 4. Færdiggør og genåbn

Færdiggør tilbuddet én gang, og vælg Se tilbud. Kontrollér tilbudsnummer, startstatus Færdiggjort, kunde, virksomhedsoplysninger, logo, linjer, priser og betingelser. Genindlæs tilbudssiden. De samme oplysninger skal vises.

Gå tilbage til projektets tilbudshistorik, og åbn det samme tilbud igen. Skift status til Sendt, genindlæs og kontrollér dropdown, statusmærke og historik.

## 5. PDF og den gemte tilbudskopi

Download PDF. Knappen skal vise Genererer PDF, mens dokumentet oprettes. Kontrollér nummer, kunde, virksomhedsoplysninger, logo, priser og betingelser mod det færdige tilbud.

Ret derefter projektets kladde, fx projekttitel eller betalingsbetingelser. Genåbn det tidligere færdiggjorte tilbud og download PDF igen. Det tidligere tilbud og PDF skal beholde deres oprindelige oplysninger.

## Lokale kontroller

- Prisberegning, udelukkelse af ikke-accepterede linjer og blokering ved manglende kundenavn.
- Blokering af dobbelt færdiggørelse, mens første kald afventer svar.
- Genåbning af færdigt tilbud med genindlæste data og brug af tilbudskopien frem for kladden.
- PDF-dokumentets indhold, filnavn og ventetid samt håndtering af asynkron PDF-fejl og nyt forsøg.

Disse lokale kontroller bruger de faktiske Angular-klasser med simulerede afhængigheder. Johans separate bekræftelse af appkontrollen ovenfor dækker det sammenhængende flow i hans miljø.
