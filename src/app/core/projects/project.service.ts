import { Injectable } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import type { ProjectResponse } from '../ai/project-response';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  async getProjects() {
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
      .eq('company_id', membership.company_id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Kunne ikke hente projekter: ${error.message}`);
    }

    return data;
  }

  async getProject(projectId: string) {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw new Error(`Kunne ikke hente projekt: ${projectError.message}`);
    }

    const [workItemsResult, materialsResult, messagesResult] = await Promise.all([
      supabase.from('project_work_items').select('*').eq('project_id', projectId),

      supabase.from('project_materials').select('*').eq('project_id', projectId),

      supabase
        .from('project_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }),
    ]);

    if (workItemsResult.error) throw workItemsResult.error;
    if (materialsResult.error) throw materialsResult.error;
    if (messagesResult.error) throw messagesResult.error;

    return {
      project,
      workItems: workItemsResult.data,
      materials: materialsResult.data,
      messages: messagesResult.data,
    };
  }

  async createProject() {
    // Find den aktuelle bruger
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Brugeren er ikke logget ind.');
    }

    // Find brugerens virksomhed
    const { data: membership, error: membershipError } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      throw new Error('Kunne ikke finde brugerens virksomhed.');
    }

    // Opret projektet via vores eksisterende databasefunktion
    const { data, error } = await supabase.rpc('create_project', {
      p_company_id: membership.company_id,
    });

    if (error) {
      throw new Error(`Kunne ikke oprette projekt: ${error.message}`);
    }

    if (!data) {
      throw new Error('Supabase returnerede ikke et projekt-ID.');
    }

    return data;
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
      throw new Error(`Kunne ikke gemme beskeden: ${error.message}`);
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
    // Hent eksisterende arbejdsopgaver.
    const { data: existingItems, error: fetchError } = await supabase
      .from('project_work_items')
      .select('*')
      .eq('project_id', projectId);

    if (fetchError) {
      throw fetchError;
    }

    const existingById = new Map(existingItems.map((item) => [item.id, item]));

    const itemsToSave = workItems.map((item) => {
      const existing = existingById.get(item.id);

      return {
        project_id: projectId,
        id: item.id,
        trade: item.trade,

        description: item.description,

        // Bevar eksisterende status.
        status:
          existing?.status === 'accepted' || existing?.status === 'rejected'
            ? existing.status
            : item.status,

        // Brugerens egne estimater har altid prioritet.
        estimated_hours:
          existing?.estimated_hours_source === 'user'
            ? existing.estimated_hours
            : item.estimatedHours,

        estimated_hours_source:
          existing?.estimated_hours_source === 'user' ? 'user' : item.estimatedHoursSource,
      };
    });

    if (itemsToSave.length === 0) {
      return;
    }

    const { error: saveError } = await supabase.from('project_work_items').upsert(itemsToSave, {
      onConflict: 'id',
    });

    if (saveError) {
      throw saveError;
    }
  }

  async saveAiMaterials(projectId: string, materials: ProjectResponse['materials']): Promise<void> {
    const { data: existingMaterials, error: fetchError } = await supabase
      .from('project_materials')
      .select('*')
      .eq('project_id', projectId);

    if (fetchError) throw fetchError;

    const existingById = new Map((existingMaterials ?? []).map((item) => [item.id, item]));

    const materialsToSave = materials.map((material) => {
      const existing = existingById.get(material.id);

      return {
        project_id: projectId,
        id: material.id,
        name: material.name,
        description: material.description,

        // Bevar accepterede og afviste materialer.
        status:
          existing?.status === 'accepted' || existing?.status === 'rejected'
            ? existing.status
            : material.status,

        // Bevar brugerens egne mængder.
        quantity: existing?.quantity_source === 'user' ? existing.quantity : material.quantity,

        quantity_source: existing?.quantity_source === 'user' ? 'user' : material.quantitySource,

        // Bevar brugerens egne enheder.
        unit: existing?.unit_source === 'user' ? existing.unit : material.unit,

        unit_source: existing?.unit_source === 'user' ? 'user' : material.unitSource,

        // AI må aldrig overskrive eksisterende priser.
        unit_price: existing?.unit_price ?? null,
      };
    });

    if (materialsToSave.length === 0) return;

    const { error: saveError } = await supabase.from('project_materials').upsert(materialsToSave, {
      onConflict: 'id',
    });

    if (saveError) throw saveError;
  }

  async saveAiProjectDetails(projectId: string, response: ProjectResponse): Promise<void> {
    // Hent de nuværende oplysninger.
    const { data: existing, error: fetchError } = await supabase
      .from('projects')
      .select(
        `
      customer_name,
      customer_address,
      title,
      description,
      offer_description
    `,
      )
      .eq('id', projectId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Bevar eksisterende oplysninger.
    // AI udfylder foreløbig kun tomme felter.
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        customer_name: existing.customer_name ?? response.customer.name,

        customer_address: existing.customer_address ?? response.customer.address,

        title: existing.title ?? response.project.title,

        description: existing.description ?? response.project.description,

        offer_description: existing.offer_description ?? response.project.offerDescription,
      })
      .eq('id', projectId);

    if (updateError) {
      throw updateError;
    }
  }
}
