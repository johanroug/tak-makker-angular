import type { ProjectService } from '../projects/project.service';

type ProjectData = Awaited<ReturnType<ProjectService['getProject']>>;
export type OfferRequirement = {
  key: string;
  label: string;
  action?: 'details' | 'tasks' | 'materials' | 'company';
  field?: 'title' | 'customerName' | 'customerAddress' | 'description' | 'hourlyRate';
};

export function validAmount(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}

export function offerRequirements(data: ProjectData): OfferRequirement[] {
  const issues: OfferRequirement[] = [];
  const project = data.project;
  const company = data.company;
  const missingCompanyFields: string[] = [];
  if (!company?.name?.trim()) missingCompanyFields.push('navn');
  if (!/^[0-9]{8}$/.test(company?.cvr?.trim() ?? '')) missingCompanyFields.push('CVR (8 cifre)');
  if (!company?.address?.trim()) missingCompanyFields.push('adresse');
  if (!company?.phone?.trim()) missingCompanyFields.push('telefon');
  if (!company?.email?.trim()) missingCompanyFields.push('e-mail');
  if (missingCompanyFields.length) {
    issues.push({
      key: 'company',
      label: `Udfyld virksomhedsprofilens ${missingCompanyFields.join(', ')}`,
      action: 'company',
    });
  }
  for (const [field, value, label] of [
    ['title', project.title, 'Udfyld projekttitel'],
    ['customerName', project.customer_name, 'Udfyld kundenavn'],
    ['customerAddress', project.customer_address, 'Udfyld kundeadresse'],
    ['description', project.description, 'Udfyld projektbeskrivelse'],
  ] as const) {
    if (!value?.trim()) issues.push({ key: field, label, action: 'details', field });
  }
  if (!validAmount(project.hourly_rate)) {
    issues.push({ key: 'hourlyRate', label: 'Projektets timepris mangler eller er ugyldig', action: 'details', field: 'hourlyRate' });
  }
  const work = data.workItems.filter((item) => item.status === 'accepted');
  const materials = data.materials.filter((item) => item.status === 'accepted');
  if (!work.length && !materials.length) {
    issues.push({
      key: 'lines',
      label: 'Acceptér mindst én opgave eller ét materiale',
      action: 'tasks',
    });
  }
  work.forEach((item, index) => {
    const missing = [];
    if (!item.trade?.trim()) missing.push('fag');
    if (!item.description?.trim()) missing.push('beskrivelse');
    if (!validAmount(item.estimated_hours)) missing.push('gyldigt antal timer');
    if (missing.length)
      issues.push({
        key: `work-${item.id}`,
        label: `Opgave ${index + 1}: Udfyld ${missing.join(', ')}`,
        action: 'tasks',
      });
  });
  materials.forEach((item, index) => {
    const missing = [];
    if (!item.name?.trim()) missing.push('navn');
    if (!validAmount(item.quantity)) missing.push('gyldigt antal');
    if (!item.unit?.trim()) missing.push('enhed');
    if (!validAmount(item.unit_price)) missing.push('gyldig enhedspris');
    if (missing.length)
      issues.push({
        key: `material-${item.id}`,
        label: `Materiale ${index + 1}: Udfyld ${missing.join(', ')}`,
        action: 'materials',
      });
  });
  return issues;
}
