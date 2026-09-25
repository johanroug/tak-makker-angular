import { Injectable } from "@angular/core";
import { supabase } from "../supabase/supabase.client";

export type CompanyProfile = {
  companyName: string;
  cvr: string;
  contactName: string;
  phone: string;
  email: string;
  defaultHourlyRate: number | null;
};

@Injectable({
  providedIn: "root",
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
      .from("company_members")
      .select(`
        company:companies!company_members_company_id_fkey (
          id,
          name,
          cvr,
          contact_name,
          phone,
          email,
          default_hourly_rate
        )
      `)
      .eq("user_id", user.id)
      .single();

    if (error || !data?.company) {
      return null;
    }

    const company = Array.isArray(data.company)
      ? data.company[0]
      : data.company;

    if (!company) {
      return null;
    }

    return {
      companyName: company.name ?? "",
      cvr: company.cvr ?? "",
      contactName: company.contact_name ?? "",
      phone: company.phone ?? "",
      email: company.email ?? "",
      defaultHourlyRate: company.default_hourly_rate,
    };
  }
}