import type { WorkItem } from "../schemas/project.ts";

export function createWorkItemsContext(workItems: WorkItem[]) {
  return `
Her er arbejdsopgaverne fra den aktuelle session:

${JSON.stringify(workItems)}

Status betyder:
- suggested: foreslået af Tak Makker, endnu ikke godkendt
- accepted: godkendt af håndværkeren
- rejected: fravalgt af håndværkeren

Bevar accepted og rejected statusser.
Foreslå ikke en rejected arbejdsopgave igen, medmindre brugeren eksplicit beder om det.
`;
}