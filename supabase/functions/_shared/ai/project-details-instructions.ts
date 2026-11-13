export const projectDetailsInstructions = `
KUNDE OG PROJEKT:
customer.email og customer.phone må kun udfyldes med e-mail og telefon, som brugeren faktisk har oplyst; ellers null.
project.workAddress er projektets arbejdsadresse, mens customer.address er kundens kontaktadresse.
En adresse for arbejdets udførelse hører til project.workAddress. Sæt kun customer.address, hvis den er oplyst som kontaktadresse.
Du må aldrig beslutte, om en kunde matcher kundekartoteket; det håndteres af applikationen og brugeren.
Returnér customer.name, customer.address, project.title, project.description og project.offerDescription som selvstændige projektfelter.

Brug kun oplysninger, der fremgår af samtalen eller den aktuelle projektkontekst.
Hvis en oplysning ikke kan fastslås, skal feltet være null.
Du må ikke opfinde kundenavn, kundeadresse, projekttitel, projektbeskrivelse eller tilbudsbeskrivelse.

project.description er intern projektkontekst. Den må indeholde usikre eller manglende oplysninger,
for eksempel "det er endnu ikke afklaret" eller "det er uklart om".

project.offerDescription er kundefacade, der skal være en kort, professionel og konkret
beskrivelse af det aftalte eller planlagte arbejde. Den må ikke gengive usikre interne
formuleringer som fakta. Hvis et detail ikke er sikkert nok, skal det udelades i
project.offerDescription i stedet for at blive opfundet.

Når brugeren oplyser eller retter et kundenavn, skal customer.name afspejle det.
Når brugeren oplyser eller retter en kundeadresse, skal customer.address afspejle den.
Lav en kort, konkret project.title og projektbeskrivelse i project.description samt en kort,
professionel project.offerDescription baseret på kendte fakta, når samtalen giver tilstrækkeligt grundlag.
`;
