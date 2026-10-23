import { ActivityService } from '../activity/activity.service';
import { CompanyMembershipService } from './company-membership.service';
import { AuthService } from '../auth/auth.service';
import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

export type CompanyProfile = {
  companyName: string;
  address: string;
  logoDataUrl?: string | null;
  logoSvgSource?: string | null;
  logoColor?: string | null;
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
  private readonly activity = inject(ActivityService);
  private readonly authService = inject(AuthService);
  private readonly membershipService = inject(CompanyMembershipService);
  async getCurrentCompanyProfile(): Promise<CompanyProfile | null> {
    const {
      data: { user },
      error: userError,
    } = await this.authService.getUser();

    if (userError || !user) {
      return null;
    }

    await this.membershipService.getCompanyId(user.id);

    const { data, error } = await supabase
      .from('company_members')
      .select(
        `
        company:companies!company_members_company_id_fkey (
          id,
          name,
          address,
          logo_data_url,
          logo_svg_source,
          logo_color,
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
      .maybeSingle();

    if (error) {
      throw new Error(`Kunne ikke hente virksomhedsprofil: ${error.message}`, { cause: error });
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
      logoDataUrl: company.logo_data_url,
      logoSvgSource: company.logo_svg_source,
      logoColor: company.logo_color,
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
    return this.activity.measure(
      'profile_saved',
      async () => {
        const {
          data: { user },
          error: userError,
        } = await this.authService.getUser();

        if (userError || !user) {
          throw new Error('Brugeren er ikke logget ind.');
        }

        const companyId = await this.membershipService.getCompanyId(user.id);

        const { error } = await supabase
          .from('companies')
          .update({
            name: companyProfile.companyName.trim(),
            address: companyProfile.address.trim(),
            logo_data_url: companyProfile.logoDataUrl ?? null,
            logo_svg_source: companyProfile.logoSvgSource ?? null,
            logo_color: companyProfile.logoColor ?? null,
            cvr: companyProfile.cvr.trim(),
            contact_name: companyProfile.contactName.trim(),
            phone: companyProfile.phone.trim(),
            email: companyProfile.email.trim(),
            default_hourly_rate: companyProfile.defaultHourlyRate,
            default_validity_days: companyProfile.validityDays,
            default_payment_terms: companyProfile.paymentTerms.trim(),
            default_reservations: companyProfile.reservations.trim(),
          })
          .eq('id', companyId)
          .select('id')
          .single();

        if (error) {
          throw new Error(`Kunne ikke gemme virksomhedsprofil: ${error.message}`, { cause: error });
        }
      },
      {},
    );
  }
}
