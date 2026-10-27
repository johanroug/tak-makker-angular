import type { Material } from "../schemas/project.ts";

export function createMaterialsContext(materials: Material[]) {
  return `
Her er materialerne fra den aktuelle session:

${JSON.stringify(materials)}

Status betyder:
- suggested: foreslået af Hovedet på sømmet, endnu ikke godkendt
- accepted: godkendt af håndværkeren
- rejected: fravalgt af håndværkeren

Bevar accepted og rejected statusser.
Foreslå ikke et rejected materiale igen, medmindre brugeren eksplicit beder om det.
Medtag alle øvrige eksisterende materialer, der mangler unitPrice, med et
numerisk prisestimat, også selvom quantity og unit ikke ændres.
Medtag også eksisterende ikke-fravalgte materialer med manglende quantity
eller unit, når det pågældende source-felt ikke er "user". Udfyld dem
med et foreløbigt mængdeestimat og en passende indkøbsenhed.
`;
}
