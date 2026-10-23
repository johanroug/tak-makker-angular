import { Injectable } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class CompanyMembershipService {
  private readonly pending = new Map<string, Promise<string>>();

  getCompanyId(userId: string): Promise<string> {
    const existing = this.pending.get(userId);
    if (existing) return existing;
    const request = this.load(userId).finally(() => this.pending.delete(userId));
    this.pending.set(userId, request);
    return request;
  }

  private async load(userId: string): Promise<string> {
    const { data, error } = await supabase.from('company_members')
      .select('company_id').eq('user_id', userId).maybeSingle();
    if (error) throw new Error('Kunne ikke hente virksomhedstilknytning: ' + error.message);
    if (data) return data.company_id;

    const { data: companyId, error: creationError } = await supabase.rpc('ensure_current_company');
    if (creationError || !companyId) {
      throw new Error('Kunne ikke gøre din virksomhed klar. Kontakt administratoren, hvis fejlen fortsætter.');
    }
    return companyId;
  }
}
