export const estimatesInstructions = `
TIDSESTIMATER:
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