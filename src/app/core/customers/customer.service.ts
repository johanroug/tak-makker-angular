import { Injectable, inject } from '@angular/core';
import { Observable, Subject, defer, from, map, switchMap, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CompanyMembershipService } from '../company/company-membership.service';
import { supabase } from '../supabase/supabase.client';
import { Database } from '../supabase/database.types';

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerValues = Pick<Customer, 'name' | 'address' | 'email' | 'phone'> & Partial<Pick<Customer, 'postal_code' | 'city'>>;
export type CustomerSummary = Customer & { project_count: number; last_activity: string; possible_duplicate: boolean };
export type CustomerChoice = { id: string; values?: CustomerValues; customer?: CustomerSummary };
export type CustomerProject = { id: string; project_number: string; title: string | null; work_address: string | null; total_count: number; matches: boolean; offer_status?: string | null };

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly auth = inject(AuthService);
  private readonly membership = inject(CompanyMembershipService);
  private readonly updates = new Subject<void>();
  readonly changes = this.updates.asObservable();

  private company(): Observable<string> {
    return defer(() => this.auth.getUser()).pipe(switchMap(({ data, error }) => {
      if (error || !data.user) throw new Error('Log ind igen.');
      return from(this.membership.getCompanyId(data.user.id));
    }));
  }

  search(query = '', offset = 0, limit = 25, duplicatesOf?: string): Observable<CustomerSummary[]> {
    return this.company().pipe(switchMap(company => supabase.rpc('search_customers', {
      p_company_id: company, p_query: query.slice(0, 160), p_offset: offset, p_limit: limit,
      ...(duplicatesOf ? { p_duplicates_of: duplicatesOf } : {}),
    })), map(({ data, error }) => {
      if (error) throw error;
      return data as unknown as CustomerSummary[];
    }));
  }

  get(id: string): Observable<Customer> {
    return defer(() => supabase.from('customers').select('*').eq('id', id).single()).pipe(map(({ data, error }) => {
      if (error) throw error;
      return data;
    }));
  }

  projectContact(projectId: string) {
    return defer(() => supabase.from('projects')
      .select('customer_id, customer:customers!projects_customer_company_fkey(*)')
      .eq('id', projectId).single()).pipe(map(({ data, error }) => {
      if (error) throw error;
      return data;
    }));
  }

  projects(id: string, query = '', offset = 0): Observable<CustomerProject[]> {
    return defer(() => supabase.rpc('list_customer_projects', { p_customer_id: id, p_query: query.slice(0, 160), p_offset: offset })).pipe(map(({ data, error }) => {
      if (error) throw error;
      return data as unknown as CustomerProject[];
    }), switchMap(projects => {
      if (!projects.length) return from([projects]);
      return from(supabase.from('projects').select('id, offers(status, finalized_at)')
        .in('id', projects.map(project => project.id))
        .order('finalized_at', { referencedTable: 'offers', ascending: false, nullsFirst: false })
        .limit(1, { referencedTable: 'offers' })).pipe(map(({ data, error }) => {
          if (error) throw error;
          const statuses = new Map(data.map(project => [project.id, project.offers[0]?.status ?? null]));
          return projects.map(project => ({ ...project, offer_status: statuses.get(project.id) ?? null }));
        }));
    }));
  }

  save(id: string, values: CustomerValues, expected?: string): Observable<Customer> {
    return this.company().pipe(switchMap(company => supabase.rpc('save_customer_details', {
      p_id: id, p_company_id: company, p_name: values.name.trim(), p_address: values.address.trim(),
      p_email: values.email.trim(), p_phone: values.phone.trim(),
      p_postal_code: values.postal_code?.trim() ?? '', p_city: values.city?.trim() ?? '',
      ...(expected ? { p_expected_updated_at: expected } : {}),
    })), map(({ data, error }) => {
      if (error) throw error;
      return data;
    }), tap(() => this.updates.next()));
  }

  link(projectId: string, customerId: string, expected: string | null): Observable<void> {
    return defer(() => supabase.rpc('link_project_customer', {
      p_project_id: projectId, p_customer_id: customerId, ...(expected ? { p_expected_customer_id: expected } : {}),
    })).pipe(map(({ error }) => { if (error) throw error; }), tap(() => this.updates.next()));
  }

  resolve(source: string, target: string, same: boolean): Observable<void> {
    return defer(() => supabase.rpc('resolve_customer_duplicate', {
      p_source: source, p_target: target, p_same_customer: same,
    })).pipe(map(({ error }) => { if (error) throw error; }), tap(() => this.updates.next()));
  }
}
