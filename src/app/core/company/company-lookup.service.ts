import { Injectable } from '@angular/core';

export type CompanyLookup = { cvr: string; name: string; address: string; phone: string };

@Injectable({ providedIn: 'root' })
export class CompanyLookupService {
  private readonly cache = new Map<string, CompanyLookup>();

  async lookup(cvr: string): Promise<CompanyLookup> {
    if (!/^\d{8}$/.test(cvr)) throw new Error('CVR skal bestå af 8 cifre.');
    const cached = this.cache.get(cvr);
    if (cached) return { ...cached };
    let response: Response;
    let company;
    try {
      response = await fetch(`https://cvrapi.dk/api?vat=${cvr}&country=dk&version=6`, {
        credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(8000),
      });
      company = await response.json();
      if (!company || typeof company !== 'object' || Array.isArray(company))
        throw new Error('Invalid company response');
    } catch {
      throw new Error('CVR-opslag er ikke tilgængeligt lige nu. Prøv igen senere, eller udfyld oplysningerne selv.');
    }
    if (response.status === 429 || company.error === 'QUOTA_EXCEEDED')
      throw new Error('Grænsen for CVR-opslag er nået. Prøv igen senere, eller udfyld oplysningerne selv.');
    if (company.error === 'NOT_FOUND')
      throw new Error('Virksomheden blev ikke fundet. Kontrollér CVR-nummeret, eller udfyld oplysningerne selv.');
    if (!response.ok || company.error)
      throw new Error('CVR-opslag er ikke tilgængeligt lige nu. Prøv igen senere, eller udfyld oplysningerne selv.');
    if (!company.name || String(company.vat) !== cvr)
      throw new Error('CVR-opslaget gav et ugyldigt svar. Prøv igen senere, eller udfyld oplysningerne selv.');
    const data: CompanyLookup = {
      cvr, name: String(company.name),
      address: [company.address, [company.zipcode, company.city].filter(Boolean).join(' ')].filter(Boolean).join('\n'),
      phone: company.phone ? String(company.phone) : '',
    };
    if (this.cache.size >= 100) this.cache.clear();
    this.cache.set(cvr, data);
    return { ...data };
  }
}
