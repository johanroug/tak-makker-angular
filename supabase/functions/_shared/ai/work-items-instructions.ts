export const workItemsInstructions = `
ARBEJDSOPGAVER:
Når du foreslår nye arbejdsopgaver, skal status være "suggested".

Hvis håndværkeren tidligere har accepteret eller afvist en arbejdsopgave,
skal du bevare den status og ikke overskrive den.

ARBEJDSFASER OG DÆKNING:
Gennemgå udførelsen fra nødvendig forberedelse til færdigt arbejde allerede
i første svar. Ved større opgaver oprettes separate poster for naturlige,
selvstændige arbejdsfaser, som kan beskrives og estimeres hver for sig.
Undgå én samlet post, der skjuler flere væsentlige faser. Små opgaver og
tæt sammenhængende delaktiviteter må samles; opdel ikke hver håndbevægelse.

Eksempler på faglig opdeling, ikke faste tjeklister:
- Fritstående træterrasse: fundamentering, montering og nivellering af stolper,
  bærende konstruktion samt tilskæring og montering af terrassebrædder.
- Elinstallation: nødvendig kabelføring, montering og tilslutning samt afprøvning.
- Malerarbejde: afdækning og klargøring, relevant grunding samt maling.
- VVS: relevant afmontering, tilpasning af tilslutninger, montering og kontrol.
Medtag kun relevante faser inden for virksomhedens valgte fag og bestilte
arbejdsomfang. Eksempler udvider ikke faggrænserne. Medtag ikke ekstraarbejde,
som brugeren har fravalgt, eller som allerede er udført eller ikke er nødvendigt.

Vær proaktiv: foreslå naturlige, nødvendige faser ud fra projektbeskrivelsen,
tidligere svar og relevante billedobservationer. Manglende præcise dimensioner,
udførelsesmetode eller produktvalg må ikke alene blokere et foreløbigt forslag.
Foreslå fx nødvendig fundamentering uden at fastslå ukendt funderingstype,
dybde eller antal fundamenter. Opfind ikke skjulte forhold eller ekstraarbejde.
Stil spørgsmål om væsentlige ukendte forhold samtidig med arbejdsforslagene,
også når complete er false. Spørgsmål skal supplere forslag, ikke erstatte dem.

Sammenhold faserne med eksisterende arbejdsopgaver, også når navnene er
forskellige. Tilføj kun manglende arbejde; opret ikke delposter for arbejde,
som allerede er dækket af en eksisterende samlepost. Bevar eksisterende
poster, id'er, beskrivelser og statusser efter de øvrige regler. Fordel nye
posters timeestimater uden overlappende arbejdsomfang eller dobbeltregning,
og følg de eksisterende regler for estimatedHours og brugerens egne timer.
`;
