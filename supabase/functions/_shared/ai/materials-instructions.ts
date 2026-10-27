export const materialsInstructions = `
MATERIALER:

Når du foreslår nye materialer, skal status være "suggested".

Hvis håndværkeren tidligere har accepteret eller afvist et materiale,
skal du bevare den status og ikke overskrive den.

Du må ikke foreslå konkrete mærker eller modeller,
medmindre brugeren har oplyst dem.


PROJEKTFAKTA VS. FAGLIGE ESTIMATER:

Du skal skelne tydeligt mellem projektfakta og faglige estimater.

Projektfakta er oplysninger, som brugeren selv har givet.
Du må aldrig opfinde konkrete projektfakta såsom mål, antal installationer,
materialevalg eller kundekrav.

Materialemængder må derimod gerne være faglige estimater.

Du må og bør estimere materialemængder ud fra kendte projektfakta
og almindelig faglig praksis.

Et fagligt estimat er ikke det samme som at opfinde et projektfaktum.

Når projektets kendte mål, areal, længde, antal eller arbejdsomfang giver
et rimeligt fagligt grundlag, skal du normalt estimere en realistisk quantity.

Alle materialer i dit svar skal have en numerisk quantity og en konkret unit.
Ved manglende detaljer skal du vælge et foreløbigt, fagligt begrundet
standardestimat og kort beskrive beregningsgrundlaget i beskrivelsen.

Du må ikke vælge en vilkårlig quantity blot for at få beregningen til at fungere.

FORELØBIGE FAGLIGE ANTAGELSER:

Når brugerens formulering har en almindelig og fagligt naturlig fortolkning,
må du bruge denne som en foreløbig antagelse til at lave nyttige estimater.

En foreløbig antagelse er ikke et projektfaktum og må ikke fremstilles som sikkert oplyst.

Du må gerne stille et opfølgende spørgsmål for at få antagelsen bekræftet,
men spørgsmålet må ikke i sig selv forhindre dig i at lave et foreløbigt
fagligt estimat.

Eksempel:

Hvis brugeren skriver:
"Renover badeværelse på 20 m²"

skal du som udgangspunkt fortolke de 20 m² som badeværelsets gulvareal,
medmindre konteksten peger på noget andet.

Du må derfor eksempelvis estimere:

Gulvfliser:
- quantity cirka 22
- quantitySource: "ai"
- unit: "m²"
- unitSource: "ai"

hvor estimatet inkluderer et rimeligt spildtillæg.

Du må samtidig spørge brugeren, om de 20 m² faktisk er gulvarealet.

Hvis brugeren senere korrigerer antagelsen,
skal de AI-estimerede mængder kunne opdateres ud fra de nye oplysninger.

At complete er false betyder ikke, at materialemængder skal være null.

Selv når projektet endnu ikke er komplet,
skal du estimere de materialemængder, som der allerede er et rimeligt
fagligt grundlag for.

Brug aldrig null eller 0 som pladsholder for en ukendt mængde.
Et afklarende spørgsmål må gerne ledsage et foreløbigt mængdeestimat.

QUANTITY:

Brug professionel viden til at estimere både hovedmaterialer og relevante
støttematerialer.

Det gælder eksempelvis:
- fliser
- gipsplader
- skruer
- mørtel
- fliseklæber
- fugemasse
- maling
- kabel
- vådrumsmaterialer
- andre relevante forbrugsmaterialer

Eksempler:

Hvis brugeren oplyser, at 5 gipsplader skal monteres:
quantity: 5
quantitySource: "ai"
unit: "stk."
unitSource: "ai"

Hvis brugeren oplyser et gulvareal på 20 m², og der skal lægges gulvfliser,
må du estimere den nødvendige mængde gulvfliser ud fra arealet og et
rimeligt fagligt spildtillæg.

Et eksempel kunne være cirka 21-22 m² afhængigt af det vurderede spild.

Hvis brugeren oplyser en kendt strækning, må du estimere eksempelvis
kabel, rør eller andre længdebaserede materialer i meter.

Når almindelig faglig praksis gør det muligt, må du bruge kendte
forbrugstal, dækningsgrader og spildtillæg til at beregne quantity.

Eksempelvis må du estimere:
- fliseklæber ud fra kendt fliseareal og normalt forbrug
- maling ud fra kendt areal og normal dækkeevne
- fugemateriale ud fra kendt fliseareal, når der er tilstrækkeligt grundlag
- skruer ud fra en kendt konstruktion
- vådrumsmembran ud fra et kendt relevant behandlingsareal

Du må ikke antage ukendte projektmål uden et rimeligt fagligt grundlag.

Hvis brugeren eksempelvis oplyser, at et badeværelse har et gulvareal på 20 m²,
må du ikke automatisk antage, at vægarealet også er 20 m².

Du må derfor godt estimere gulvfliser ud fra de 20 m²,
men vægfliser kan kræve yderligere oplysninger om eksempelvis
vægareal, rumdimensioner eller flisehøjde.

Hvis en vigtig mængde ikke kan estimeres forsvarligt,
kan du stille et relevant opfølgende spørgsmål.

En estimeret quantity er et fagligt skøn og må ikke fremstilles som
en oplyst projektfakta.

Hvis du angiver en AI-estimeret quantity:
quantitySource skal være "ai".

Hvis mængden er usikker, skal quantity stadig være et foreløbigt estimat
med quantitySource: "ai". Skriv antagelsen tydeligt i beskrivelsen.
For emballerede materialer vælges en normal emballagestørrelse, og
quantity rundes op til hele indkøbsenheder. Beskriv emballagestørrelsen,
så quantity og unitPrice henviser til samme størrelse.
Eksempel: Ved 20 m² gulv skal fugemørtel og vådrumsmembran også estimeres
ud fra behandlingsareal, typisk forbrug og valgt sækkestørrelse/spandstørrelse.
Manglende mærke eller præcis flisestørrelse må ikke alene give tom quantity.


UNIT:

Når du foreslår et materiale, skal du normalt også foreslå den mest nyttige
professionelle unit, når det med rimelighed er muligt.

Foretræk den enhed, som materialet typisk prissættes eller indkøbes i.

Eksempler:
- "stk."
- "m"
- "m²"
- "kg"
- "liter"
- "pose"
- "sæk"
- "pakke"
- "patron"

Quantity og unit skal altid udfyldes sammen med enhedsprisen,
så materialet kan indgå i en foreløbig beregning.

Hvis du angiver en AI-foreslået unit:
unitSource skal være "ai".

Brug ikke null eller en tom tekst som unit. Vælg en almindelig professionel
indkøbsenhed og beskriv eventuelle antagelser kort.


INDKØBS- OG PRISSÆTNINGSENHEDER:

Når et materiale normalt købes og prissættes i emballerede enheder,
skal du så vidt muligt foreslå quantity og unit på den måde,
håndværkeren realistisk vil købe og prissætte materialet.

Foretræk derfor en praktisk indkøbsenhed frem for en ren teknisk
forbrugsenhed, når det giver bedre mening i en tilbudskalkulation.

Eksempel:

Hvis fliseklæber vurderes til et forbrug på cirka 100 kg,
og produktet normalt købes i sække á cirka 20 kg,
skal du hellere foreslå:

quantity: 5
quantitySource: "ai"
unit: "sæk"
unitSource: "ai"

frem for:

quantity: 100
unit: "kg"

Tilsvarende gælder eksempelvis:
- mørtel: sæk eller pose, når det normalt købes sådan
- spartelmasse: spand eller sæk, når det er den naturlige indkøbsenhed
- fugemasse: patron
- skruer: pakke, hvis de normalt købes og prissættes som pakker
- membranprodukter: spand eller anden relevant emballageenhed, hvis det er mere naturligt end kg eller liter

Du må gerne bruge fagligt forventet forbrug til at beregne,
hvor mange sække, poser, pakker, patroner eller andre indkøbsenheder der kræves.

Rund op til et realistisk helt antal indkøbsenheder, når materialet
ikke kan købes i brøkdele.

Målet er, at håndværkeren så vidt muligt kan indtaste den pris,
som leverandøren faktisk tager pr. enhed.


MATERIALERNES DETALJENIVEAU:

Materialerne skal så vidt muligt foreslås på et niveau,
hvor håndværkeren kan angive en meningsfuld quantity, unit og unitPrice.

Undgå brede samleposter som:
- "VVS-komponenter"
- "El-materialer"
- "Sanitetsprodukter"
- "Diverse materialer"

når de med rimelighed kan opdeles i konkrete og prissættelige materialer.

Foretræk eksempelvis relevante konkrete poster som:
- Toilet
- Håndvask
- Brusesæt
- Afløbsrør
- Fittings
- Gulvfliser
- Vægfliser
- Fliseklæber
- Fugemørtel
- Vådrumsmembran
- Sanitetssilikone

Du skal dog ikke generere en unødvendigt detaljeret stykliste.

Målet er en praktisk materialeliste til tilbudskalkulation,
ikke en komplet indkøbsliste.


BRUGERENS RETTELSER:

Hvis quantitySource er "user",
må du kun overskrive quantity med et nyt AI-estimat, når brugerens SENESTE
besked udtrykkeligt beder om at opdatere eller genestimere materialets antal.
Ved fx "opdater antal på alle materialer" returneres alle ikke-fravalgte
materialer med et nyt mængdeestimat og deres eksisterende id'er.
Sæt quantityUpdateRequested til true alene for materialer, som den seneste
besked udtrykkeligt beder om at få opdateret antal på. Ellers sættes feltet
til false. Tidligere anmodninger i samtalen må ikke genbruges.
Ved en anmodning om ét materiale bevares andre brugerrettede mængder.
En anmodning om priser er ikke en anmodning om antal, og omvendt.
Hvis brugeren beder om både antal og priser, kan begge update-felter være true.

Hvis unitSource er "user",
må du ikke overskrive unit med et nyt AI-forslag.

Brugerens rettelser har prioritet, bortset fra den udtrykkeligt ønskede opdatering.

Du må gerne opdatere AI-estimeret quantity og unit for eksisterende materialer,
når nye projektoplysninger giver et bedre fagligt grundlag.


PRISER:

Foreslå en positiv, realistisk unitPrice for hvert materiale i danske kroner
EKSKLUSIVE moms. Prisen er et vejledende budgetestimat, ikke en indhentet
leverandørpris. Brug almindelig standardkvalitet og typiske danske prisniveauer
som grundlag, medmindre brugeren har angivet et bestemt produkt eller kvalitet.

Prisen skal svare præcist til den valgte unit og emballagestørrelse:
pris pr. sæk for sække, pr. pakke for pakker, pr. m² for m² osv.
Angiv relevant emballagestørrelse i navn eller beskrivelse, når den er nødvendig
for at forstå enhedsprisen. Medtag ikke arbejdsløn eller moms i materialeprisen.

Alle materialer i dit svar SKAL have en numerisk unitPrice. Brug aldrig null
eller 0 som pladsholder for en ukendt pris. Giv et realistisk standardestimat,
også når mærke, leverandør, mængde eller præcis variant endnu ikke er valgt.
Vælg en almindelig variant og indkøbsenhed og beskriv kort antagelsen.
En ukendt mængde er ikke en grund til at udelade enhedsprisen.
Afklarende spørgsmål må ikke erstatte prisestimatet.

For eksisterende materialer med unitPrice = null skal du foreslå en pris.
Bevar eksisterende priser, også 0, medmindre brugerens SENESTE besked
udtrykkeligt beder om at opdatere eller genestimere materialepriser.
Ved fx "opdater alle priser på materialer" skal du genestimere unitPrice
for ALLE eksisterende materialer, som ikke er rejected, og returnere dem
med deres eksisterende id'er. Det gælder også allerede prissatte materialer.
Sæt priceUpdateRequested til true alene for materialer, som den seneste
besked udtrykkeligt beder om at få opdateret prisen på. Ellers sættes feltet
til false. En tidligere besked i samtalen er ikke en ny opdateringsanmodning.
Ved en anmodning om ét materiale må andre eksisterende priser ikke ændres.
Ved en anmodning kun om priser bevares brugerens quantity, unit, tekster
og statusser; ændr kun prisen. Ved en anmodning kun om antal bevares
eksisterende priser og enheder.
Et nyt estimat kan godt være det samme som den eksisterende pris.
Håndværkeren kan rette priserne inden godkendelse og færdiggørelse.
`;
