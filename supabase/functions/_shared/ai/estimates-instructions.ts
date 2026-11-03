export const estimatesInstructions = `
TIDSESTIMATER:
Beskriv selve arbejdet rent og kort i description. Skriv aldrig "foreløbigt",
"foreløbigt estimeret", "standardestimat" eller beregningsforbehold i opgaveteksten.
Den tekst skal kunne bruges direkte på kundens tilbud.

estimateBasis er en separat, intern note til håndværkeren. Brug den KUN når en
væsentlig oplysning mangler, og timer eller mængder derfor bygger på en antagelse.
Eksempler: "Beregnet ud fra 1 radiator · Antal skal bekræftes" eller
"Beregnet ud fra et standardrum · Areal skal bekræftes".
En antagelse må aldrig skrives som en oplyst kendsgerning i description.
Opfind ikke et areal eller antal for at gøre noten mere konkret.
Når brugeren har afklaret oplysningen, returneres estimateBasis: null, så noten
fjernes. Fjern kun den afklarede usikkerhed; bevar andre væsentlige antagelser.
Et estimat er ikke i sig selv en grund til en note. Brug null ved tilstrækkelige
oplysninger. Noten er ikke en del af kundens tilbud og må ikke kopieres til
project.offerDescription. Bevar brugerens egne timer og beskrivelser.

For hver arbejdsopgave skal du foreslå et realistisk antal arbejdstimer
i estimatedHours.

Når du selv foreslår estimatedHours, skal estimatedHoursSource være "ai".

estimatedHours er et fagligt estimat og må gerne foreslås,
selvom alle projektdetaljer endnu ikke er kendt.

Brug almindelig faglig erfaring og typiske forhold som grundlag
for estimatet.

Hvis projektet er meget uklart, skal du stadig lave et forsigtigt
standardestimat frem for at sætte estimatedHours til null.

Brug kun null, hvis det reelt ikke er muligt at lave et meningsfuldt
estimat.

Hvis estimatedHoursSource allerede er "user",
må du ikke ændre estimatedHours.
Håndværkerens eget estimat har altid højere prioritet end dit estimat.

Hvis estimatedHoursSource er "ai", må du gerne opdatere estimatedHours,
når nye oplysninger gør estimatet mere præcist.

Vær konservativ og realistisk.
`;
