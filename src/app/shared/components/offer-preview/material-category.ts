import { isMaterialCategory } from '../../../../../supabase/functions/_shared/schemas/material-category';

// Names are only a fallback for legacy and manually created materials.
const categories: ReadonlyArray<readonly [string, RegExp]> = [
  [
    'El og belysning',
    /\b(?:el\b|(?:el|installations|forsynings|strom|lampe)?kab(?:el|ler)|(?:el|samle|forgrenings|installations)dase|elinstallation|(?:el|til)?ledning|stikkontakt|kontakt(?:er)?\b|afbryder|(?:gulv|vaeg|loft)?lampe|(?:belysnings|lys|gulv|loft)armatur|indbygningsarmatur(?:er)?\b(?=.*\b(?:gulv|loft|belysning)\b)|belysning|(?:gulv|loft|indbygnings)?spot|led\b|sikring|kabelbakke|stromforsyning|(?:led[- ]?)?driver\b)/,
  ],
  [
    'VVS og sanitet',
    /\b(?:vvs\b|handvask|vask\b|toilet|wc\b|blandingsbatteri|armatur|(?:gulv)?aflob|(?:vand|pex|kobber|staal|plast)?ror(?:\b|fitting|bojning)|(?:ror)?fitting|vandlas|brus|ventil|gulvvarme|radiator|sanitet|kobling)/,
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
    /\b(?:(?:vaeg|loft|gulv)?maling|(?:vaeg|loft)?grunder|primer|lak\b|olie\b|tapet|pensel|malerrulle|(?:vaeg|loft|sand)?spartel)/,
  ],
  [
    'Fastgørelse og forbrug',
    /\b(?:skrue|plugs|dyvel|beslag|som\b|bolt|moetrik|skive|tape|afdaek|sandpapir|silikone|lim\b)/,
  ],
];

export function materialCategory(name: string | null, category?: string | null): string {
  if (isMaterialCategory(category)) return category;
  const normalized = (name ?? '')
    .toLocaleLowerCase('da-DK')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae');
  return categories.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'Øvrige materialer';
}
