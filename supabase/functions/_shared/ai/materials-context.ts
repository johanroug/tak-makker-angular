import type { Material } from "../schemas/project.ts";

export function createMaterialsContext(materials: Material[]) {
  return `
Her er materialerne fra den aktuelle session:

${JSON.stringify(materials)}

Status betyder:
- suggested: foreslået af Tak Makker, endnu ikke godkendt
- accepted: godkendt af håndværkeren
- rejected: fravalgt af håndværkeren

Bevar accepted og rejected statusser.
Foreslå ikke et rejected materiale igen, medmindre brugeren eksplicit beder om det.
`;
}