import { Injectable } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

export type CompanyProfile = {
  companyName: string;
  address: string;
  cvr: string;
  contactName: string;
  phone: string;
  email: string;
  defaultHourlyRate: number | null;
  validityDays: number | null;
  paymentTerms: string;
  reservations: string;
};

@Injectable({
  providedIn: 'root',
})
export class CompanyService {
  async getCurrentCompanyProfile(): Promise<CompanyProfile | null> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('company_members')
      .select(
        `
        company:companies!company_members_company_id_fkey (
          id,
          name,
          address,
          cvr,
          contact_name,
          phone,
          email,
          default_hourly_rate,
          default_validity_days,
          default_payment_terms,
          default_reservations
        )
      `,
      )
      .eq('user_id', user.id)
      .single();

    if (error) {
      throw new Error(`Kunne ikke hente virksomhedsprofil: ${error.message}`);
    }
    if (!data?.company) {
      return null;
    }

    const company = Array.isArray(data.company) ? data.company[0] : data.company;

    if (!company) {
      return null;
    }

    return {
      companyName: company.name ?? '',
      address: company.address ?? '',
      cvr: company.cvr ?? '',
      contactName: company.contact_name ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      defaultHourlyRate: company.default_hourly_rate,
      validityDays: company.default_validity_days,
      paymentTerms: company.default_payment_terms ?? '',
      reservations: company.default_reservations ?? '',
    };
  }

  async updateCurrentCompanyProfile(companyProfile: CompanyProfile): Promise<void> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Brugeren er ikke logget ind.');
    }

    const { data: membership, error: membershipError } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      throw new Error('Kunne ikke finde brugerens virksomhed.');
    }

    const { error } = await supabase
      .from('companies')
      .update({
        name: companyProfile.companyName.trim(),
        address: companyProfile.address.trim(),
        cvr: companyProfile.cvr.trim(),
        contact_name: companyProfile.contactName.trim(),
        phone: companyProfile.phone.trim(),
        email: companyProfile.email.trim(),
        default_hourly_rate: companyProfile.defaultHourlyRate,
        default_validity_days: companyProfile.validityDays,
        default_payment_terms: companyProfile.paymentTerms.trim(),
        default_reservations: companyProfile.reservations.trim(),
      })
      .eq('id', membership.company_id)
      .select('id')
      .single();

    if (error) {
      throw new Error(`Kunne ikke gemme virksomhedsprofil: ${error.message}`);
    }
  }
}
