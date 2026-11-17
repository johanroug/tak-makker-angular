interface DemoJob {
  name?: string;
  description: string;
  hours: number;
}

interface DemoMaterial {
  name: string;
  category?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface DemoExample {
  trade: string;
  icon: string;
  title: string;
  description: string;
  hourlyRate: number;
  jobs: DemoJob[];
  materials: DemoMaterial[];
}

export const DEMO_EXAMPLES: readonly DemoExample[] = [
  {
    trade: 'Elektriker',
    icon: 'plug',
    title: 'Installér 5 spots i et køkken',
    description:
      'Montér fem dæmpbare LED-spots i køkkenets gipsloft. Der er adgang over loftet og et eksisterende lampeudtag. Udskift afbryderen med en lysdæmper.',
    hourlyRate: 666,
    jobs: [
      {
        description: 'Montere og tilslutte fem dæmpbare LED-spots i gipsloftet.',
        hours: 2.5,
      },
      {
        description: 'Udskifte afbryderen med lysdæmper og afprøve installationens funktion.',
        hours: 1,
      },
      {
        description: 'Føre og klargøre kabler fra eksisterende lampeudtag til fem spotplaceringer.',
        hours: 1.5,
      },
    ],
    materials: [
      {
        name: 'Dæmpbare LED-spots',
        category: 'El og belysning',
        quantity: 5,
        unit: 'stk.',
        unitPrice: 300,
      },
      { name: 'Lysdæmper', category: 'El og belysning', quantity: 1, unit: 'stk.', unitPrice: 450 },
      {
        name: 'Tilslutningsklemmer, pakke',
        category: 'El og belysning',
        quantity: 1,
        unit: 'pakke',
        unitPrice: 50,
      },
      {
        name: 'Installationskabel til spots',
        category: 'El og belysning',
        quantity: 15,
        unit: 'm',
        unitPrice: 15,
      },
    ],
  },
  {
    trade: 'Maler',
    icon: 'paintRoller',
    title: 'Mal en stue på 30 m²',
    description:
      'Mal vægge i en stue på 30 m² gulvareal. Der er cirka 50 m² vægflade. Spartl små skruehuller, og giv væggene to lag lys maling.',
    hourlyRate: 666,
    jobs: [
      {
        description: 'Spartling og slibning af små skruehuller.',
        hours: 2,
      },
      {
        description: 'Maling af væggene med to lag lys maling.',
        hours: 8,
      },
      {
        description: 'Afdækning og klargøring af arbejdsområdet og væggene.',
        hours: 1.5,
      },
    ],
    materials: [
      {
        name: 'Afdækningspap, rulle',
        category: 'Fastgørelse og forbrug',
        quantity: 2,
        unit: 'rulle',
        unitPrice: 90,
      },
      {
        name: 'Afdækningstape',
        category: 'Fastgørelse og forbrug',
        quantity: 2,
        unit: 'rulle',
        unitPrice: 35,
      },
      {
        name: 'Lys vægmaling, 10 l',
        category: 'Maling og overflader',
        quantity: 1,
        unit: 'spand',
        unitPrice: 850,
      },
      {
        name: 'Lys vægmaling, 2,5 l',
        category: 'Maling og overflader',
        quantity: 1,
        unit: 'spand',
        unitPrice: 300,
      },
      {
        name: 'Slibepapir, pakke',
        category: 'Maling og overflader',
        quantity: 1,
        unit: 'pakke',
        unitPrice: 50,
      },
      {
        name: 'Spartelmasse til små huller, 1 kg',
        category: 'Maling og overflader',
        quantity: 1,
        unit: 'pakke',
        unitPrice: 60,
      },
    ],
  },
  {
    trade: 'Tømrer',
    icon: 'hammer',
    title: 'Byg en træterrasse på 20 m²',
    description:
      'Byg en lav træterrasse på 4 × 5 m med trykimprægnerede brædder. Underlaget er plant og fast, og terrassen skal være uden trin og gelænder.',
    hourlyRate: 666,
    jobs: [
      {
        description: 'Opbygning og nivellering af terrasseunderkonstruktionen.',
        hours: 7,
      },
      {
        description: 'Tilskæring og montering af trykimprægnerede terrassebrædder.',
        hours: 9,
      },
      {
        description: 'Kontrol og klargøring af underlaget til terrasseopbygningen.',
        hours: 2,
      },
      {
        description: 'Etablering og nivellering af understøtning til terrassekonstruktionen.',
        hours: 4,
      },
    ],
    materials: [
      {
        name: 'Terrasseskruer til udendørs brug, pakke á 500 stk.',
        category: 'Fastgørelse og forbrug',
        quantity: 2,
        unit: 'pakke',
        unitPrice: 350,
      },
      {
        name: 'Underlagsklodser til terrasse',
        category: 'Øvrige materialer',
        quantity: 20,
        unit: 'stk.',
        unitPrice: 25,
      },
      {
        name: 'Trykimprægnerede terrassebrædder',
        category: 'Træ, plader og isolering',
        quantity: 22,
        unit: 'm²',
        unitPrice: 480,
      },
      {
        name: 'Trykimprægneret konstruktionstræ, ca. 45 × 95 mm',
        category: 'Træ, plader og isolering',
        quantity: 70,
        unit: 'm',
        unitPrice: 42,
      },
    ],
  },
];
