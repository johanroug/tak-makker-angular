export interface TradePage {
  slug: string;
  trade: string;
  title: string;
  description: string;
  heading: string;
  accent: string;
  image: string;
  screenshot: string;
  screenshotWidth: number;
  screenshotHeight: number;
  shortIntro: string;
  singular: string;
  intro: string;
  sections: { heading: string; text: string }[];
  example: { title: string; description: string; items: string[]; check: string };
  questions: { question: string; answer: string }[];
}

export const TRADE_PAGES: TradePage[] = [
  {
    slug: 'tilbudsprogram-til-vvs',
    trade: 'VVS',
    title: 'Tilbudsprogram til VVS | Hovedet på sømmet',
    description: 'Lav VVS-tilbud med overblik over arbejdsopgaver, materialer og timer. Tilpas dine priser, og hent en PDF med dit logo. Prøv 10 gratis forespørgsler.',
    heading: 'Styr på rørene.',
    accent: 'Og på tilbuddet.',
    image: '/marketing/craft-still-life.jpg',
    shortIntro: 'Saml VVS-opgaver, materialer og arbejdstid i et tilbud, du selv gennemgår og prissætter.',
    singular: 'VVS',
    screenshot: '/marketing/tilbud-vvs-v3.jpg',
    screenshotWidth: 1567, screenshotHeight: 1050,
    intro: 'Et VVS-tilbud skal gøre det tydeligt, hvad kunden får, og hvilke forhold prisen bygger på. Beskriv arbejdet i Hovedet på sømmet, gennemgå forslagene og tilpas udkastet med din erfaring og dine leverandørpriser.',
    sections: [
      {
        heading: 'Fra besigtigelse til konkrete arbejdsopgaver',
        text: 'Beskriv installationen, kundens ønsker og de forhold, du kender på stedet. Ved udskiftning af radiatorer kan du eksempelvis skelne mellem afmontering, montering og afsluttende kontrol. Vælg VVS som virksomhedens fag, så forslagene tager udgangspunkt i din entreprise. Du afgør, hvilke opgaver der skal med.',
      },
      {
        heading: 'Brug dine egne materialer og priser',
        text: 'Gennemgå forslag til radiatorer, ventiler, tilslutninger og øvrige materialer. Kontrollér antal, dimensioner og produktvalg mod de faktiske installationer. Indtast dine aktuelle enhedspriser, ret de estimerede timer og angiv projektets timepris. Programmet har ikke en direkte forbindelse til din grossists priser.',
      },
      {
        heading: 'Et samlet tilbud med klare forudsætninger',
        text: 'Tilføj kundens oplysninger, beskriv omfanget og angiv betalingsbetingelser og forbehold. Godkend de opgaver og materialer, der skal indgå, og hent det færdige tilbud som PDF med firmaoplysninger og logo. Du sender selv tilbuddet til kunden.',
      },
    ],
    example: {
      title: 'Eksempel: Udskiftning af to radiatorer',
      description: 'Notér antal, placering, ønskede produkter og de eksisterende forhold. Et tilbudsudkast kan opdeles i:',
      items: ['Afmontering og håndtering af de eksisterende radiatorer', 'Montering og tilslutning af nye radiatorer', 'Tilpasning af ventiler og tilslutningsmaterialer', 'Kontrol, aflevering og oprydning'],
      check: 'Kontrollér selv produktvalg, dimensionering, adgangsforhold og nødvendige følgearbejder. Eksemplet viser en tilbudsopdeling og er ikke en installationsvejledning eller en komplet materialeliste.',
    },
    questions: [
      { question: 'Henter programmet mine aktuelle grossistpriser?', answer: 'Nej. Du kontrollerer og indtaster selv priserne fra dine leverandører. Materiale- og timeforslag skal gennemgås, før du godkender dem.' },
      { question: 'Kan jeg bruge forskellige timepriser på mine projekter?', answer: 'Ja. Din standardtimepris kopieres til nye projekter, og du kan ændre timeprisen på det enkelte projekt under Rediger.' },
      { question: 'Kan jeg prøve tilbudsprogrammet gratis?', answer: 'Du kan oprette en konto uden betalingskort og bruge virksomhedens 10 gratis forespørgsler. Kun gennemførte svar tæller.' },
    ],
  },
  {
    slug: 'tilbudsprogram-til-toemrer',
    trade: 'Tømrere',
    title: 'Tilbudsprogram til tømrere | Hovedet på sømmet',
    description:
      'Fra terrasse til tagarbejde: Få hjælp til tilbud som tømrer. Tilpas opgaver, materialer og timer, og hent en PDF med dit logo. Prøv 10 gratis forespørgsler uden betalingskort.',
    heading: 'Godt håndværk.',
    accent: 'Også på papiret.',
    image: '/marketing/carpentry.jpg',
    shortIntro:
      'Fra terrasse til tagarbejde. Få hjælp til opgaver, materialer og priser — tilpasset din måde at arbejde på.',
    singular: 'Tømrer',
    screenshot: '/marketing/tilbud-toemrer-v3.jpg',
    screenshotWidth: 1567, screenshotHeight: 1050,
    intro:
      'En ny terrasse er mere end brædder og skruer. Der er underlag, konstruktion, tilpasninger og kundens valg. Hovedet på sømmet hjælper dig fra beskrivelsen af opgaven til et tilbudsudkast, som du selv gennemgår og prissætter.',
    sections: [
      {
        heading: 'Gør kundens ønsker til konkrete arbejdsopgaver',
        text: 'Beskriv, hvad kunden skal have lavet, og hvilke mål og materialevalg du kender. Brug samtalen til at uddybe projektet. Gennemgå forslagene til arbejdsopgaver, så forberedelse, montering og afslutning fremgår af tilbuddet. Du retter beskrivelserne, så de passer til din måde at udføre arbejdet på.',
      },
      {
        heading: 'Tilpas materialer og arbejdstid med din erfaring',
        text: 'Træsort, dimensioner, adgangsforhold og eksisterende konstruktion gør en forskel for beregningen. Kontrollér materialeforslagene, ret mængder og enheder, og indsæt dine egne enhedspriser. Vurdér timerne til hver arbejdsopgave, og brug din virksomheds timepris. AI-forslag erstatter ikke din opmåling eller dine leverandørpriser.',
      },
      {
        heading: 'Saml aftalen i et tilbud med dit navn på',
        text: 'Tilføj kundeoplysninger, projektbeskrivelse og dine tilbudsbetingelser. Når du har kontrolleret omfang og priser, færdiggør du tilbuddet og henter en PDF med firmaoplysninger og logo fra din virksomhedsprofil. Du sender selv PDF-filen til kunden.',
      },
    ],
    example: {
      title: 'Eksempel: En træterrasse ved huset',
      description:
        'Start med en beskrivelse af terrassens mål, ønsket træsort og det underlag, du har besigtiget. Et tilbudsudkast kan opdeles sådan:',
      items: [
        'Klargøring og opmåling af arbejdsområdet',
        'Opbygning af underkonstruktion',
        'Montering og tilpasning af terrassebrædder',
        'Afslutninger og oprydning',
      ],
      check:
        'Kontrollér især fundering, konstruktion, spild, befæstelse og bortkørsel. Eksemplet er en illustration af opdelingen, ikke en komplet materialeliste eller en konstruktionsteknisk vejledning.',
    },
    questions: [
      {
        question: 'Kan jeg bruge Hovedet på sømmet til både små og store tømreropgaver?',
        answer:
          'Du kan beskrive forskellige typer tømreropgaver og tilpasse udkastet. Ved større eller komplekse projekter skal du selv sikre, at alle delarbejder, forudsætninger og nødvendige faglige vurderinger er med.',
      },
      {
        question: 'Henter Hovedet på sømmet mine aktuelle træpriser?',
        answer:
          'Du indtaster og kontrollerer selv enhedspriserne. Brug dine aktuelle priser fra trælasten eller leverandøren, når du tilpasser udkastet.',
      },
    ],
  },
  {
    slug: 'tilbudsprogram-til-murer',
    trade: 'Murere',
    title: 'Tilbudsprogram til murere | Hovedet på sømmet',
    description:
      'Lav tilbud på murer- og flisearbejde med hjælp fra Hovedet på sømmet. Gennemgå materialer, timer og omfang, og hent dit tilbud som PDF. Prøv 10 gratis forespørgsler.',
    heading: 'Styr på tilbuddet.',
    accent: 'Helt ned i fugen.',
    image: '/marketing/craft-still-life.jpg',
    shortIntro:
      'Få hjælp til at strukturere opgaver, materialer og priser — tilpasset dit murerarbejde. Du har fagligheden. Vi hjælper med overblikket.',
    singular: 'Murer',
    screenshot: '/marketing/tilbud-murer-v3.jpg',
    screenshotWidth: 1567, screenshotHeight: 1050,
    intro:
      'Når du giver tilbud på fliser eller andet murerarbejde, skal forarbejdet med. Hovedet på sømmet hjælper med at samle beskrivelsen, opgaverne og materialerne, så du kan tilpasse tilbuddet med din faglige vurdering.',
    sections: [
      {
        heading: 'Beskriv både overfladen og arbejdet nedenunder',
        text: 'Angiv, hvad der skal udføres, arealet, de kendte forhold og kundens materialevalg. Er der eksisterende belægning, som skal fjernes? Hvad ved du om underlaget? Brug oplysningerne til at gennemgå udkastets arbejdsopgaver og præcisere, hvilke forberedelser og afslutninger du har medregnet.',
      },
      {
        heading: 'Gennemgå mængder og materialeforbrug',
        text: 'Areal alene fortæller ikke, hvor meget fliseklæber, fuge eller spartelmasse der skal bruges. Kontrollér forslagene mod opmålingen, produktdata og de faktiske forhold. Ret antal, enhed og pris på hvert materiale. Tilpas derefter timerne til opgaven, herunder tilskæringer og den adgang, du har på stedet.',
      },
      {
        heading: 'Gør omfang og forudsætninger tydelige for kunden',
        text: 'Brug projektbeskrivelsen og tilbudsbetingelserne til at forklare, hvad prisen omfatter, og hvilke forhold der skal afklares. Gennemgå kundeoplysninger og total, før du færdiggør tilbuddet. Du kan hente en PDF med dit firmas oplysninger og sende den til kunden.',
      },
    ],
    example: {
      title: 'Eksempel: Nye gulvfliser i en entré',
      description:
        'Beskriv et opmålt gulvareal på cirka 12 m², den ønskede flise og det kendte underlag. Del tilbuddet op i overskuelige arbejdsopgaver:',
      items: [
        'Afdækning og klargøring af arbejdsområdet',
        'Forberedelse af underlag efter besigtigelse',
        'Fliselægning med nødvendige tilskæringer',
        'Fugning, afslutning og rengøring',
      ],
      check:
        'Afklar, hvem der leverer fliserne, og om fjernelse af eksisterende gulv er inkluderet. Ved vådrum eller andre særlige forhold kræves særskilt faglig vurdering; entréeksemplet dækker ikke disse krav.',
    },
    questions: [
      {
        question: 'Kan jeg rette forslag til materialer og mængder?',
        answer:
          'Ja. Du kan ændre materialernes navn, beskrivelse, antal, enhed og enhedspris. Kontrollér altid forbruget mod den valgte løsning og produktets anvisninger.',
      },
      {
        question: 'Er tilbudseksemplet en fast kvadratmeterpris?',
        answer:
          'Nej. Eksemplet viser kun en mulig opdeling af opgaven. Du vurderer selv timer, materialer og priser ud fra projektet.',
      },
    ],
  },
  {
    slug: 'tilbudsprogram-til-maler',
    trade: 'Malere',
    title: 'Tilbudsprogram til malere | Hovedet på sømmet',
    description:
      'Tilbud på malerarbejde med overblik over afdækning, forarbejde, materialer og timer. Tilpas udkastet i Hovedet på sømmet og hent en PDF. Prøv 10 gratis forespørgsler.',
    heading: 'Et godt tilbud.',
    accent: 'Med den rette finish.',
    image: '/marketing/painting.jpg',
    shortIntro:
      'Fra forarbejde til sidste strøg. Saml opgaver, materialer og dine priser i et tilbud, du selv har styr på.',
    singular: 'Maler',
    screenshot: '/marketing/tilbud-maler-v3.jpg',
    screenshotWidth: 1567, screenshotHeight: 1050,
    intro:
      'Afdækning, afrensning og spartling kan fylde lige så meget i tilbuddet som selve malingen. Hovedet på sømmet hjælper dig med at samle arbejdsopgaver og materialer i et udkast, som du tilpasser til rummene og overfladerne.',
    sections: [
      {
        heading: 'Start med rummene og overfladernes stand',
        text: 'Beskriv, hvilke rum og overflader kunden vil have malet. Angiv mål, underlag, kendte skader og de ønsker, I har aftalt. Præcisér, om opgaven omfatter vægge, lofter, træværk eller flere dele. Jo tydeligere beskrivelsen er, desto bedre et udgangspunkt har du for at gennemgå udkastet.',
      },
      {
        heading: 'Skil forarbejde og behandlinger ad',
        text: 'Gennemgå forslagene og tilpas arbejdsopgaverne til det faktiske behov for afdækning, afvaskning, spartling, slibning, grunder og maling. Beskriv de behandlinger, der er inkluderet, og vurdér timerne. Kontrollér materialemængder mod opmålt areal, antal behandlinger og produkternes rækkeevne.',
      },
      {
        heading: 'Sæt dine egne priser og afslut med en PDF',
        text: 'Indtast dine materialers enhedspriser og brug timeprisen fra din virksomhedsprofil. Tilføj kundeoplysninger og betingelser, og kontrollér, at tilbuddet beskriver den finish og det omfang, kunden forventer. Færdiggør det og hent en PDF med dit firmanavn og logo, som du selv kan sende.',
      },
    ],
    example: {
      title: 'Eksempel: Maling af vægge og loft i en stue',
      description:
        'Beskriv stuen, de opmålte overflader og deres stand. Aftal farver og omfang med kunden. Udkastet kan fx indeholde:',
      items: [
        'Afdækning af gulv og beskyttelse af inventar',
        'Afrensning og nødvendigt spartelarbejde',
        'Slibning og grunding, hvor det er aftalt',
        'Maling af vægge og loft samt oprydning',
      ],
      check:
        'Afklar, om flytning af møbler, træværk og ekstra behandlinger er med. Eksemplet angiver ingen standardpris eller garanti for dækkeevne; du tilpasser løsningen til overfladen og produktet.',
    },
    questions: [
      {
        question: 'Kan jeg specificere spartling og afdækning særskilt?',
        answer:
          'Du kan rette arbejdsopgavernes beskrivelser og timer, så forarbejdet fremgår tydeligt af dit tilbud. Kontrollér udkastet, så det afspejler det, du har aftalt med kunden.',
      },
      {
        question: 'Beregner Hovedet på sømmet præcist, hvor meget maling jeg skal købe?',
        answer:
          'Materialeforslag skal kontrolleres af dig. Forbruget afhænger blandt andet af areal, underlag, antal behandlinger og malingens rækkeevne.',
      },
    ],
  },
];
