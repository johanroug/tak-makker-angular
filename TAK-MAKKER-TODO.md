# Tak Makker TODO — 16. oktober 2026

## Tilbudsbetingelser
- [x] Find virksomhedsprofil, project.service.ts og offer.service.ts.
- [x] Virksomhedsstandarder: gyldighed, betalingsbetingelser og forbehold.
- [x] Projekt: redigér, gem og annullér betingelser; valider hele positive gyldighedsdage.
- [x] Database-migration med standarder ved projektoprettelse og atomisk tilbudskopi.
- [x] Vis betingelser i udkast, færdigt tilbud og PDF.
- [x] Bevar eksisterende RPC’er, prisberegning, AI-felter og historiske tilbud.
- [x] Angular-produktionsbuild gennemført uden fejl (advarsler om størrelser og PDF-afhængigheder).
- [x] Ændringer gennemgået igen 16. oktober 2026; produktionsbuild genkørt uden fejl.
- [x] Målrettede kontroller: ugyldige dage, gemning/rydning, tom ændring og PDF-indhold med nye/ældre tilbud.
- [ ] Anvend migrationen på Supabase før den nye frontend tages i brug — kræver Johans godkendelse.
- [x] Johan har testet gem/genindlæs af virksomhedsstandarder og arv af standarder på nye projekter.
- [x] Johan har bekræftet gemte betalingsbetingelser og forbehold i både projects og offers.
- [x] Johan har testet, at ændringer på projektet ikke ændrer betingelserne på det færdige tilbud.
- [ ] Bekræft migrationens fulde status; de nye betalings- og forbeholdskolonner er observeret i projects og offers.
- [ ] Kontrollér, at ændrede virksomhedsstandarder ikke ændrer eksisterende projekter og tilbud.
- [ ] Kontrollér i appen: annullér, tomme felter, ugyldige dage samt lange forbehold i PDF.

Den oprindelige TODO-liste var ikke tilgængelig i chatreferencen. Denne liste dækker den aktuelle disciplin.

## Arbejdsgang
- Vis den opdaterede TODO-liste, hver gang en disciplin afsluttes.
- Arbejd kun i projektmappen; adgang udenfor kræver Johans godkendelse.
- Databaseændringer kræver Johans godkendelse.

## Seneste gennemgang
- Ingen konkrete fejl fundet ved kodegennemgangen. Migrationen er kun læst, ikke kørt.
- Build: `npm.cmd run build` bestået. Advarsler: initial bundle 629,52 kB mod 500 kB; offer-preview SCSS 4,12 kB og project-sidebar SCSS 7,34 kB mod 4 kB; CommonJS-afhængigheder fra pdfmake.
- Tidligere målrettede kontroller ovenfor er registreret fra den eksisterende liste; de er ikke genkørt ved denne gennemgang.
- Database- og appkontrollerne er fortsat åbne; disciplinen er derfor ikke fuldt verificeret.
