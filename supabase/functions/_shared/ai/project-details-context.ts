import type { ProjectDraft } from "../schemas/project.ts";

type ProjectDetailsContextParams = Pick<ProjectDraft, "customer" | "project">;

export function createProjectDetailsContext({
  customer,
  project,
}: ProjectDetailsContextParams) {
  return `
Her er kunde- og projektoplysningerne fra den aktuelle session:

${JSON.stringify({ customer, project })}

Bevar eksisterende oplysninger, medmindre samtalen indeholder en rettelse
eller en mere præcis, men stadig faktabaseret oplysning.
Felter med source "user" er manuelt rettet og skal altid bevares,
også når værdien er tom. Håndværkeren retter disse felter i formularen.

project.description er den interne projektkontekst.
project.offerDescription er den kundeforståelige tilbudsbeskrivelse,
der skal være professionel, kort og uden usikre interne formuleringer.
`;
}
