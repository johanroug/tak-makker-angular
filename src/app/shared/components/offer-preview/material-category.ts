// Presentation categories only: individual material lines remain unchanged.
const categories: ReadonlyArray<readonly [string, RegExp]> = [
  [
    'El og belysning',
    /\b(?:el\b|elkabel|eldase|elinstallation|kabel|ledning|stikkontakt|afbryder|lampe|belysning|spot|led\b|sikring|kabelbakke)/,
  ],
  [
    'VVS og sanitet',
    /\b(?:vvs\b|handvask|vask\b|toilet|wc\b|blandingsbatteri|armatur|(?:gulv)?aflob|(?:vand|pex|kobber|staal|plast)?ror(?:\b|fitting|bojning)|vandlas|brus|ventil|gulvvarme|radiator|sanitet|kobling)/,
  ],
  [
    'Fliser, mørtel og vådrum',
    /\b(?:(?:gulv|vaeg)?flise|(?:gulv|vaeg)?klinke|fuge|mortel|cement|beton|armering|mursten|vaadrum|vadrum|membran|taetningsband)/,
  ],
  [
    'Træ, plader og isolering',
    /\b(?:trae|braed|laegt|reglar|spaer|plade|gips|krydsfiner|osb\b|isolering|mineraluld|rockwool|dampspaer|forskalling)/,
  ],
  [
    'Maling og overflader',
    /\b(?:(?:vaeg|loft|gulv)?maling|grunder|primer|lak\b|olie\b|tapet|pensel|malerrulle|spartel)/,
  ],
  [
    'Fastgørelse og forbrug',
    /\b(?:skrue|plugs|dyvel|beslag|som\b|bolt|moetrik|skive|tape|afdaek|sandpapir|silikone|lim\b)/,
  ],
];

export function materialCategory(name: string | null): string {
  const normalized = (name ?? '')
    .toLocaleLowerCase('da-DK')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae');
  return categories.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'Øvrige materialer';
}
