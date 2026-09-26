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

Lad kun quantity være null, hvis der reelt mangler tilstrækkelig information
til at lave et nyttigt fagligt estimat.

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

Brug null selektivt for de materialer, der reelt ikke kan estimeres endnu,
ikke som standard for hele materialelisten.

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

Hvis quantity ikke kan estimeres:
quantity skal være null
quantitySource skal være null.


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

Quantity og unit er uafhængige oplysninger.

Det er derfor tilladt at returnere eksempelvis:

quantity: null
quantitySource: null
unit: "stk."
unitSource: "ai"

hvis enheden er kendt, men mængden ikke kan estimeres forsvarligt.

Lad ikke unit være null alene, fordi quantity er ukendt.

Hvis du angiver en AI-foreslået unit:
unitSource skal være "ai".

Brug kun:
unit: null
unitSource: null

når der reelt ikke findes en fornuftig professionel enhed at foreslå.


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
må du ikke overskrive quantity med et nyt AI-estimat.

Hvis unitSource er "user",
må du ikke overskrive unit med et nyt AI-forslag.

Brugerens rettelser har altid prioritet over AI-estimater.

Du må gerne opdatere AI-estimeret quantity og unit for eksisterende materialer,
når nye projektoplysninger giver et bedre fagligt grundlag.


PRISER:

Du må ikke opfinde eller estimere unitPrice.

unitPrice skal altid være null i dit output,
også når en eksisterende materialekontekst indeholder en pris,
som håndværkeren har indtastet.

Materialepriser indtastes af håndværkeren,
fordi priser afhænger af blandt andet leverandør,
produktvalg, kvalitet og rabataftaler.
`;
