export const materialCategories = [
  'El og belysning',
  'VVS og sanitet',
  'Fliser, mørtel og vådrum',
  'Træ, plader og isolering',
  'Maling og overflader',
  'Fastgørelse og forbrug',
  'Øvrige materialer',
] as const;

export type MaterialCategory = typeof materialCategories[number];

export function isMaterialCategory(value: unknown): value is MaterialCategory {
  return typeof value === 'string' && materialCategories.some(category => category === value);
}
