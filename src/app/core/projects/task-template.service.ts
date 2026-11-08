import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import { AuthService } from '../auth/auth.service';
import { CompanyMembershipService } from '../company/company-membership.service';

export type TaskTemplate = {
  id: string; name: string;
  work_items: { trade: string; description: string; estimated_hours: number | null }[];
  materials: { name: string; quantity: number | null; unit: string | null; unit_price: number | null }[];
};

@Injectable({ providedIn: 'root' })
export class TaskTemplateService {
  private readonly auth = inject(AuthService);
  private readonly membership = inject(CompanyMembershipService);
  private async companyId(): Promise<string> {
    const { data: { user }, error } = await this.auth.getUser();
    if (error || !user) throw new Error('Log ind for at bruge skabeloner.');
    return this.membership.getCompanyId(user.id);
  }
  async list(): Promise<TaskTemplate[]> {
    const { data, error } = await supabase.rpc('list_task_templates', { p_company_id: await this.companyId() });
    if (error) throw new Error('Skabelonerne kunne ikke hentes. Prøv igen.');
    return (data ?? []) as unknown as TaskTemplate[];
  }
  async save(projectId: string, name: string, workIds: string[], materialIds: string[], id: string): Promise<void> {
    const { error } = await supabase.rpc('save_task_template', { p_project_id: projectId, p_name: name,
      p_work_ids: workIds, p_material_ids: materialIds, p_id: id });
    if (error) throw new Error('Skabelonen kunne ikke gemmes. Kontrollér navn og valgte linjer, og prøv igen.');
  }
  async apply(projectId: string, templateId: string, requestId: string): Promise<void> {
    const { error } = await supabase.rpc('apply_task_template', { p_project_id: projectId, p_template_id: templateId, p_request_id: requestId });
    if (error) throw new Error('Skabelonen kunne ikke indsættes. Prøv igen.');
  }
  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc('delete_task_template', { p_id: id });
    if (error) throw new Error('Skabelonen kunne ikke slettes.');
  }
  async createProject(templateId: string, requestId: string) {
    const { data, error } = await supabase.rpc('create_project_from_template', { p_company_id: await this.companyId(), p_template_id: templateId, p_request_id: requestId });
    if (error || !data) throw new Error('Projektet kunne ikke oprettes fra skabelonen.');
    return data;
  }
}
