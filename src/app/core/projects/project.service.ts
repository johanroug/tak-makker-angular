import { Injectable } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

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
}
