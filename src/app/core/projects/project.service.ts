import { ActivityService } from '../activity/activity.service';
import { CompanyMembershipService } from '../company/company-membership.service';
import { AuthService } from '../auth/auth.service';
import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import type { ProjectResponse } from '../ai/project-response';
import { Database } from '../supabase/database.types';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private readonly activity = inject(ActivityService);
  private readonly authService = inject(AuthService);
  private readonly membershipService = inject(CompanyMembershipService);
  async saveAiResponse(projectId: string, response: ProjectResponse): Promise<void> {
    const started = performance.now();
    try {
      const results = await Promise.allSettled([
        this.saveAiWorkItems(projectId, response.workItems),
        this.saveAiMaterials(projectId, response.materials),
        this.saveAiProjectDetails(projectId, response),
      ]);
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
    } finally {
      console.debug('[Hovedet på sømmet] Gemning af AI-data', {
        durationMs: Math.round(performance.now() - started),
      });
    }
  }

  private async runAiWrites(writes: Array<() => Promise<void>>): Promise<void> {
    let next = 0;
    const errors: unknown[] = [];
    const worker = async () => {
      while (next < writes.length) {
        const write = writes[next++];
        try {
          await write();
        } catch (error) {
          errors.push(error);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, writes.length) }, worker));
    if (errors.length) throw errors[0];
  }

  async getProjects() {
    const {
      data: { user },
      error: userError,
    } = await this.authService.getUser();

    if (userError || !user) {
      throw new Error('Brugeren er ikke logget ind.');
    }

    const companyId = await this.membershipService.getCompanyId(user.id);

    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        id,
        project_number,
        title,
        customer_name,
        customer_address,
        created_at
      `,
      )
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Kunne ikke hente projekter: ${error.message}`, { cause: error });
    }

    return data;
  }

  async getProject(projectId: string) {
    return this.activity.measure(
      'project_opened',
      async () => {
        const { data, error } = await supabase
          .from('projects')
          .select(
            '*, workItems:project_work_items(*), materials:project_materials(*), messages:project_messages(*)',
          )
          .eq('id', projectId)
          .order('created_at', { referencedTable: 'workItems', ascending: true })
          .order('id', { referencedTable: 'workItems', ascending: true })
          .order('created_at', { referencedTable: 'materials', ascending: true })
          .order('id', { referencedTable: 'materials', ascending: true })
          .order('created_at', { referencedTable: 'messages', ascending: true })
          .single();

        if (error) {
          throw new Error('Kunne ikke hente projekt: ' + error.message);
        }

        const { workItems, materials, messages, ...project } = data;
        return { project, workItems, materials, messages };
      },
      { projectId, onlyFailure: true },
    );
  }

  async createProject() {
    const context: { projectId?: string } = {};
    return this.activity.measure(
      'project_created',
      async () => {
        const {
          data: { user },
          error: userError,
        } = await this.authService.getUser();

        if (userError || !user) {
          throw new Error('Brugeren er ikke logget ind.');
        }

        const companyId = await this.membershipService.getCompanyId(user.id);

        const { data, error } = await supabase.rpc('create_project', {
          p_company_id: companyId,
        });

        if (error) {
          throw new Error(`Kunne ikke oprette projekt: ${error.message}`, { cause: error });
        }

        if (!data) {
          throw new Error('Supabase returnerede ikke et projekt-ID.');
        }

        context.projectId = data.id;
        return data;
      },
      context,
    );
  }

  async addMessage(projectId: string, content: string) {
    const { data, error } = await supabase
      .from('project_messages')
      .insert({
        project_id: projectId,
        role: 'user',
        content,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Kunne ikke gemme beskeden: ${error.message}`, { cause: error });
    }

    return data;
  }

  async addAssistantMessage(projectId: string, content: string) {
    const { data, error } = await supabase
      .from('project_messages')
      .insert({
        project_id: projectId,
        role: 'assistant',
        content,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async saveAiWorkItems(projectId: string, workItems: ProjectResponse['workItems']): Promise<void> {
    if (!workItems.length) return;
    const { data: existingItems, error: fetchError } = await supabase
      .from('project_work_items')
      .select('*')
      .eq('project_id', projectId);

    if (fetchError) {
      throw fetchError;
    }

    const existingById = new Map(existingItems.map((item) => [item.id, item]));
    const writes: Array<() => Promise<void>> = [];
    const newItems: Database['public']['Tables']['project_work_items']['Insert'][] = [];

    for (const item of new Map(workItems.map((item) => [item.id, item])).values()) {
      const existing = existingById.get(item.id);
      if (existing) {
        if (
          existing.estimated_hours_source === 'user' ||
          item.estimatedHours === null ||
          existing.estimated_hours === item.estimatedHours
        )
          continue;

        // Compare the snapshot in the UPDATE itself. A manual save after the
        // SELECT must win, including a deliberately cleared value or new status.
        let query = supabase
          .from('project_work_items')
          .update({
            estimated_hours: item.estimatedHours,
            estimated_hours_source: 'ai',
          })
          .eq('project_id', projectId)
          .eq('id', item.id);
        for (const [column, value] of Object.entries(existing)) {
          query = value === null ? query.is(column, null) : query.eq(column, value);
        }
        writes.push(async () => {
          const { error } = await query;
          if (error) throw error;
        });
        continue;
      }

      // A row inserted by another request since our SELECT must not be replaced.
      newItems.push({
        project_id: projectId,
        id: item.id,
        trade: item.trade,
        description: item.description,
        status: 'suggested',
        estimated_hours: item.estimatedHours,
        estimated_hours_source: 'ai',
      });
    }
    if (newItems.length)
      writes.push(async () => {
        const { error } = await supabase.from('project_work_items').upsert(newItems, {
          onConflict: 'project_id,id',
          ignoreDuplicates: true,
        });
        if (error) throw error;
      });
    await this.runAiWrites(writes);
  }

  async saveAiMaterials(projectId: string, materials: ProjectResponse['materials']): Promise<void> {
    if (!materials.length) return;
    const { data: existingMaterials, error: fetchError } = await supabase
      .from('project_materials')
      .select('*')
      .eq('project_id', projectId);

    if (fetchError) {
      throw fetchError;
    }

    const existingById = new Map((existingMaterials ?? []).map((item) => [item.id, item]));
    const writes: Array<() => Promise<void>> = [];
    const newItems: Database['public']['Tables']['project_materials']['Insert'][] = [];

    for (const material of new Map(materials.map((item) => [item.id, item])).values()) {
      const existing = existingById.get(material.id);
      if (existing) {
        const updates: Database['public']['Tables']['project_materials']['Update'] = {};
        // Replace an existing price only on an explicit price update request.
        if (
          (existing.unit_price === null || material.priceUpdateRequested === true) &&
          material.unitPrice !== null &&
          Number.isFinite(material.unitPrice) &&
          material.unitPrice > 0 &&
          material.unitPrice !== existing.unit_price
        ) {
          updates.unit_price = material.unitPrice;
        }
        if (
          (existing.quantity_source !== 'user' || material.quantityUpdateRequested === true) &&
          material.quantity !== null &&
          Number.isFinite(material.quantity) &&
          material.quantity >= 0 &&
          material.quantity !== existing.quantity
        ) {
          updates.quantity = material.quantity;
          // Keep manually controlled quantities protected after this one-off request.
          updates.quantity_source = existing.quantity_source === 'user' ? 'user' : 'ai';
        }
        if (
          existing.unit_source !== 'user' &&
          material.unit !== null &&
          material.unit !== existing.unit
        ) {
          updates.unit = material.unit;
          updates.unit_source = 'ai';
        }
        if (Object.keys(updates).length === 0) continue;

        let query = supabase
          .from('project_materials')
          .update(updates)
          .eq('project_id', projectId)
          .eq('id', material.id);
        for (const [column, value] of Object.entries(existing)) {
          query = value === null ? query.is(column, null) : query.eq(column, value);
        }
        writes.push(async () => {
          const { error } = await query;
          if (error) throw error;
        });
        continue;
      }

      newItems.push({
        project_id: projectId,
        id: material.id,
        name: material.name,
        status: 'suggested',
        quantity: material.quantity,
        quantity_source: 'ai',
        unit: material.unit,
        unit_source: 'ai',
        unit_price:
          material.unitPrice !== null && Number.isFinite(material.unitPrice) && material.unitPrice > 0
            ? material.unitPrice
            : null,
      });
    }
    if (newItems.length)
      writes.push(async () => {
        const { error } = await supabase.from('project_materials').upsert(newItems, {
          onConflict: 'project_id,id',
          ignoreDuplicates: true,
        });
        if (error) throw error;
      });
    await this.runAiWrites(writes);
  }

  async saveAiProjectDetails(projectId: string, response: ProjectResponse): Promise<void> {
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select(
        `
        customer_name,
        customer_name_source,
        customer_address,
        customer_address_source,
        title,
        title_source,
        description,
        description_source,
        offer_description,
        offer_description_source
      `,
      )
      .eq('id', projectId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    function aiValue(
      currentValue: string | null,
      currentSource: string | null,
      newValue: string | null,
    ) {
      if (currentSource === 'user') {
        return {
          value: currentValue,
          source: currentSource,
        };
      }

      if (currentValue !== null && currentSource !== 'ai') {
        return {
          value: currentValue,
          source: currentSource,
        };
      }

      if (newValue === null) {
        return {
          value: currentValue,
          source: currentSource,
        };
      }

      return {
        value: newValue,
        source: 'ai',
      };
    }

    const customerName = aiValue(
      existing.customer_name,
      existing.customer_name_source,
      response.customer.name,
    );

    const customerAddress = aiValue(
      existing.customer_address,
      existing.customer_address_source,
      response.customer.address,
    );

    const title = aiValue(existing.title, existing.title_source, response.project.title);

    const description = aiValue(
      existing.description,
      existing.description_source,
      response.project.description,
    );

    const offerDescription = aiValue(
      existing.offer_description,
      existing.offer_description_source,
      response.project.offerDescription,
    );

    const candidates = {
      customer_name: customerName.value,
      customer_name_source: customerName.source,

      customer_address: customerAddress.value,
      customer_address_source: customerAddress.source,

      title: title.value,
      title_source: title.source,

      description: description.value,
      description_source: description.source,

      offer_description: offerDescription.value,
      offer_description_source: offerDescription.source,
    };
    const updates = Object.fromEntries(
      Object.entries(candidates).filter(
        ([column, value]) => existing[column as keyof typeof existing] !== value,
      ),
    ) as Database['public']['Tables']['projects']['Update'];
    if (!Object.keys(updates).length) return;

    let query = supabase.from('projects').update(updates).eq('id', projectId);

    for (const [column, value] of Object.entries(existing)) {
      query = value === null ? query.is(column, null) : query.eq(column, value);
    }
    const { error: updateError } = await query;

    if (updateError) {
      throw updateError;
    }
  }

  async updateProjectTitle(projectId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({
        title: title.trim(),
        title_source: 'user',
      })
      .eq('id', projectId);

    if (error) {
      throw new Error(`Kunne ikke opdatere projekttitlen: ${error.message}`, { cause: error });
    }
  }

  async updateProjectDetails(
    projectId: string,
    changes: {
      customerName?: string;
      customerAddress?: string;
      title?: string;
      description?: string;
      offerDescription?: string;
      validityDays?: number | null;
      paymentTerms?: string;
      reservations?: string;
    },
  ): Promise<void> {
    type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

    const updates: ProjectUpdate = {};

    if (changes.customerName !== undefined) {
      updates.customer_name = changes.customerName.trim();

      updates.customer_name_source = 'user';
    }

    if (changes.customerAddress !== undefined) {
      updates.customer_address = changes.customerAddress.trim();

      updates.customer_address_source = 'user';
    }

    if (changes.title !== undefined) {
      updates.title = changes.title.trim();
      updates.title_source = 'user';
    }

    if (changes.description !== undefined) {
      updates.description = changes.description.trim();

      updates.description_source = 'user';
    }

    if (changes.offerDescription !== undefined) {
      updates.offer_description = changes.offerDescription.trim();

      updates.offer_description_source = 'user';
    }

    if (changes.validityDays !== undefined) {
      if (
        changes.validityDays !== null &&
        (!Number.isInteger(changes.validityDays) || changes.validityDays < 1)
      ) {
        throw new Error('Gyldighed skal være et helt antal dage på mindst 1.');
      }
      updates.validity_days = changes.validityDays;
    }
    if (changes.paymentTerms !== undefined) updates.payment_terms = changes.paymentTerms.trim();
    if (changes.reservations !== undefined) updates.reservations = changes.reservations.trim();

    if (Object.keys(updates).length === 0) {
      return;
    }

    const { error } = await supabase.from('projects').update(updates).eq('id', projectId);

    if (error) {
      throw new Error(`Kunne ikke opdatere projektoplysninger: ${error.message}`, { cause: error });
    }
  }

  async updateMaterialStatus(
    projectId: string,
    materialId: string,
    status: 'accepted' | 'rejected',
  ): Promise<void> {
    return this.activity.measure(
      'material_status_changed',
      async () => {
        const { error } = await supabase
          .from('project_materials')
          .update({
            status,
          })
          .eq('project_id', projectId)
          .eq('id', materialId);

        if (error) {
          throw new Error(`Kunne ikke opdatere materialet: ${error.message}`, { cause: error });
        }
      },
      { projectId, state: status },
    );
  }

  async updateMaterial(
    projectId: string,
    materialId: string,
    changes: {
      name?: string;
      quantity?: number | null;
      unit?: string;
      unitPrice?: number | null;
    },
  ): Promise<void> {
    return this.activity.measure(
      'material_edited',
      async () => {
        type MaterialUpdate = Database['public']['Tables']['project_materials']['Update'];

        const updates: MaterialUpdate = {};

        if (changes.name !== undefined) {
          updates.name = changes.name.trim();
        }

        if (changes.quantity !== undefined) {
          updates.quantity = changes.quantity;
          updates.quantity_source = 'user';
        }

        if (changes.unit !== undefined) {
          updates.unit = changes.unit.trim();
          updates.unit_source = 'user';
        }

        if (changes.unitPrice !== undefined) {
          updates.unit_price = changes.unitPrice;
        }

        if (Object.keys(updates).length === 0) {
          return;
        }

        const { error } = await supabase
          .from('project_materials')
          .update(updates)
          .eq('project_id', projectId)
          .eq('id', materialId);

        if (error) {
          throw new Error(`Kunne ikke opdatere materialet: ${error.message}`, { cause: error });
        }
      },
      { projectId },
    );
  }

  async updateWorkItemStatus(
    projectId: string,
    workItemId: string,
    status: 'accepted' | 'rejected',
  ): Promise<void> {
    return this.activity.measure(
      'work_status_changed',
      async () => {
        const { error } = await supabase
          .from('project_work_items')
          .update({
            status,
          })
          .eq('project_id', projectId)
          .eq('id', workItemId);

        if (error) {
          throw new Error(`Kunne ikke opdatere arbejdsopgaven: ${error.message}`, { cause: error });
        }
      },
      { projectId, state: status },
    );
  }

  async updateWorkItem(
    projectId: string,
    workItemId: string,
    changes: {
      trade?: string;
      description?: string;
    },
  ): Promise<void> {
    return this.activity.measure(
      'work_edited',
      async () => {
        type WorkItemUpdate = Database['public']['Tables']['project_work_items']['Update'];

        const updates: WorkItemUpdate = {};

        if (changes.trade !== undefined) {
          updates.trade = changes.trade.trim();
        }

        if (changes.description !== undefined) {
          updates.description = changes.description.trim();
        }

        if (Object.keys(updates).length === 0) {
          return;
        }

        const { error } = await supabase
          .from('project_work_items')
          .update(updates)
          .eq('project_id', projectId)
          .eq('id', workItemId);

        if (error) {
          throw new Error(`Kunne ikke opdatere arbejdsopgaven: ${error.message}`, { cause: error });
        }
      },
      { projectId },
    );
  }

  async updateWorkItemEstimatedHours(
    projectId: string,
    workItemId: string,
    estimatedHours: number | null,
  ): Promise<void> {
    return this.activity.measure(
      'work_edited',
      async () => {
        const { error } = await supabase
          .from('project_work_items')
          .update({
            estimated_hours: estimatedHours,
            estimated_hours_source: 'user',
          })
          .eq('project_id', projectId)
          .eq('id', workItemId);

        if (error) {
          throw new Error(`Kunne ikke opdatere estimerede timer: ${error.message}`, {
            cause: error,
          });
        }
      },
      { projectId },
    );
  }

  async finalizeOffer(projectId: string) {
    return this.activity.measure(
      'offer_finalized',
      async () => {
        const { data, error } = await supabase.rpc('finalize_offer', {
          p_project_id: projectId,
        });

        if (error) {
          throw new Error(`Kunne ikke færdiggøre tilbuddet: ${error.message}`, { cause: error });
        }

        return data;
      },
      { projectId },
    );
  }
}
