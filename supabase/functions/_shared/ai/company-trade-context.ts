const tradeScopes: Record<string, string> = {
  VVS: 'Vand-, varme- og sanitetsinstallationer, rør, afløbstilslutninger og tilhørende VVS-komponenter. Ingen fliselægning, vådrumsmembran, malerarbejde, tømrerarbejde eller elektriske installationer.',
  Tømrer: 'Tømrerarbejde, trækonstruktioner, tagkonstruktioner, døre, vinduer og beklædninger samt tilhørende materialer. Ingen VVS-, el-, murer- eller malerentreprise.',
  Murer: 'Murværk, puds, betonarbejde, fliser og vådrumsarbejde inden for murerentreprisen samt tilhørende materialer. Ingen VVS-, el-, tømrer- eller malerentreprise.',
  Elektriker: 'Elektriske installationer, kabler, tavler, belysning og tilhørende el-komponenter. Ingen VVS-, murer-, tømrer- eller malerentreprise.',
  Maler: 'Malerarbejde, forbehandling, spartling, tapet og tilhørende materialer. Ingen VVS-, el-, murer- eller tømrerentreprise.',
  Tagdækker: 'Tagdækning, tagpap, membraner og tilhørende inddækninger og materialer. Ingen øvrige fagentrepriser eller udskiftning af bærende konstruktioner.',
  Anlægsgartner: 'Have- og anlægsarbejde, beplantning, terræn og belægninger samt tilhørende materialer. Ingen bygningsentrepriser, elinstallationer eller autorisationskrævende kloakarbejde.',
  Kloakmester: 'Kloak- og afløbsanlæg i jord, brønde, ledninger og tilhørende jordarbejde og materialer. Ingen øvrige bygningsentrepriser eller indvendige VVS-installationer.',
  Gulvlægger: 'Gulvbelægninger, gulvunderlag, forberedelse og tilhørende materialer. Ingen VVS-, el-, murer-, maler- eller bærende tømrerentreprise.',
  Snedker: 'Snedkerarbejde, inventar, møbler og specialtilpassede trædele samt tilhørende materialer. Ingen VVS-, el-, murer- eller malerentreprise.',
  Entreprenør: 'Kun den entreprise og de delarbejder, brugeren konkret beskriver. Antag ikke en totalentreprise. Afklar entreprisegrænser ved tvivl.',
  Multiservice: 'Kun de serviceopgaver, brugeren konkret beskriver. Antag ikke, at virksomheden udfører alle fag. Afklar arbejdsområdet ved tvivl.',
  Andet: 'Afklar brugerens konkrete fag og arbejdsområde, før du foreslår fagafhængige opgaver og materialer. Antag ikke en totalentreprise.',
};

export function createCompanyTradeContext(value: string | string[] | null | undefined): string {
  const trades = [...new Set(Array.isArray(value) ? value : value ? [value] : [])];
  if (!trades.length) return `VIRKSOMHEDENS FAG ER IKKE VALGT.
Udled ikke virksomhedens fag af eksisterende opgaver. Afklar hvilket fag eller
hvilken entreprise brugeren vil beregne, hvis opgaven kan omfatte flere fag.
Foreslå indtil da kun de delarbejder og materialer, brugeren udtrykkeligt har bedt om.
Brug scopeWarnings: [], da der endnu ikke er valgt konkrete fag at afgrænse efter.`;
  if (trades.some((trade) => !Object.hasOwn(tradeScopes, trade))) throw new Error('Unknown company trade');
  return `VIRKSOMHEDENS FAG OG BINDENDE ENTREPRISEGRÆNSE: ${trades.join(', ')}
${trades.map((trade) => `${trade}: ${tradeScopes[trade]}`).join('\n')}

Alle de valgte fag er tilladte arbejdsområder. En udelukkelse i beskrivelsen af
ét fag udelukker IKKE et andet fag, som virksomheden også har valgt. Har
virksomheden fx valgt både VVS og Murer, må du foreslå både VVS- og murerarbejde
med tilhørende materialer, men stadig ikke el- eller malerarbejde.
Tag kun de valgte fag med, som er relevante for den konkrete opgave. Et ekstra
fagvalg er ikke i sig selv en bestilling på flere delarbejder. Entreprenør,
Multiservice og Andet ophæver ikke faggrænser; afklar deres konkrete arbejdsområde.

Denne faggrænse gælder for hele svaret, også ved brede projektbeskrivelser og
tidligere samtaler med flere fag. Generelle eksempler i andre instruktioner
udvider aldrig virksomhedens arbejdsområde. En baderenovering betyder fx ikke,
at en VVS-virksomhed skal tilbyde et komplet badeværelse.
- Foreslå og estimér kun arbejdsopgaver inden for virksomhedens fag.
- Medtag kun materialer og forbrugsmaterialer til disse arbejdsopgaver.
- Spørg kun til oplysninger, der er nødvendige for virksomhedens egen del.
- Ved opgaver uden for faget: returnér ingen opgaver/materialer for disse dele;
  giv en kort, selvstændig besked i scopeWarnings om den konkrete opgave og de
  valgte fag, fx "Vinduesudskiftning ligger uden for virksomhedens valgte fag:
  VVS og Maler." Den vises som en popup. Bevar også forklaringen og eventuelle
  relevante afklarende spørgsmål i questions, så den findes i samtalen.
  Brug scopeWarnings: [] når den seneste besked ikke indeholder nye ønsker uden
  for de valgte fag. Gentag ikke gamle advarsler fra samtalens historik.
  Lad ikke en anmodning i samtalen tilsidesætte virksomhedens valgte fag.
- Tilbudsbeskrivelsen må kun omfatte virksomhedens egen entreprise. Bevar
  brugerens manuelt fastlagte projektfelter efter de øvrige regler.
- Eksisterende linjer fra andre fag er historik, ikke tilladelse til at udvide
  arbejdsområdet. Udelad dem fra ændringsforslag; slet eller ommærk dem ikke.
- Ved anmodninger om at opdatere ALLE priser/antal gælder samme faggrænse.
- Et fagvalg dokumenterer ikke autorisation eller særlige certificeringer.
`;
}
