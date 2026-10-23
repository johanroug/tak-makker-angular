import OpenAI from 'npm:openai';
import { zodTextFormat } from 'npm:openai/helpers/zod';
import { createClient } from 'npm:@supabase/supabase-js';

import { ProjectResponseSchema } from '../_shared/schemas/project.ts';
import { aiInstructions } from '../_shared/ai/instructions.ts';
import { createWorkItemsContext } from '../_shared/ai/work-items-context.ts';
import { createMaterialsContext } from '../_shared/ai/materials-context.ts';
import { createProjectDetailsContext } from '../_shared/ai/project-details-context.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  }

  const started = performance.now();
  const timings: Record<string, number> = {};
  const measure = async <T>(name: string, action: () => PromiseLike<T>): Promise<T> => {
    const phaseStarted = performance.now();
    try {
      return await action();
    } finally {
      timings[name] = Math.round(performance.now() - phaseStarted);
    }
  };

  try {
    // 1. Kontrollér brugerens adgangstoken.
    const authorization = request.headers.get('Authorization');

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authorization },
        },
      },
    );

    const token = authorization.substring(7);
    const { data: authData, error: authError } = await measure('authMs', () =>
      supabase.auth.getUser(token),
    );

    if (authError || !authData.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { data: accessAllowed, error: accessError } = await supabase.rpc('can_access_app');
    if (accessError || accessAllowed !== true) {
      return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders });
    }

    // 2. Hent projektet.
    const body = await request.json();
    const projectId = body.projectId;

    if (typeof projectId !== 'string' || !projectId) {
      return Response.json({ error: 'Missing projectId' }, { status: 400, headers: corsHeaders });
    }

    const { data: project, error: projectError } = await measure('projectMs', () =>
      supabase.from('projects').select('*').eq('id', projectId).single(),
    );

    if (projectError || !project) {
      return Response.json({ error: 'Project not found' }, { status: 404, headers: corsHeaders });
    }

    // 3. Kontrollér medlemskab af projektets virksomhed.
    const { data: membership, error: membershipError } = await measure('membershipMs', () =>
      supabase
        .from('company_members')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('company_id', project.company_id)
        .maybeSingle(),
    );

    if (membershipError || !membership) {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    // 4. Hent eksisterende projektdata.
    const [workItemsResult, materialsResult, messagesResult] = await measure('contextMs', () =>
      Promise.all([
        measure('workItemsMs', () =>
          supabase.from('project_work_items').select('*').eq('project_id', projectId),
        ),

        measure('materialsMs', () =>
          supabase.from('project_materials').select('*').eq('project_id', projectId),
        ),

        measure('messagesMs', () =>
          supabase
            .from('project_messages')
            .select('role, content')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true }),
        ),
      ]),
    );

    if (workItemsResult.error || materialsResult.error || messagesResult.error) {
      throw new Error('Could not load project data');
    }

    // Tilpas databasens snake_case til AI-skemaets camelCase.
    const workItems = (workItemsResult.data ?? []).map((item) => ({
      id: item.id,
      trade: item.trade,
      description: item.description,
      descriptionSource: null,
      status: item.status,
      estimatedHours: item.estimated_hours,
      estimatedHoursSource: item.estimated_hours_source ?? 'ai',
    }));

    const materials = (materialsResult.data ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      quantity: item.quantity,
      quantitySource: item.quantity_source,
      unit: item.unit,
      unitSource: item.unit_source,
      unitPrice: item.unit_price,
    }));

    const customer = {
      name: project.customer_name,
      address: project.customer_address,
      nameSource: project.customer_name_source,
      addressSource: project.customer_address_source,
    };

    const projectDetails = {
      title: project.title,
      description: project.description,
      offerDescription: project.offer_description,
      titleSource: project.title_source,
      descriptionSource: project.description_source,
      offerDescriptionSource: project.offer_description_source,
    };

    // 5. Send projektets eksisterende samtale til OpenAI.
    const messages = (messagesResult.data ?? [])
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));

    if (!messages.some((message) => message.role === 'user')) {
      return Response.json(
        { error: 'Project has no user messages' },
        { status: 400, headers: corsHeaders },
      );
    }

    const response = await measure('aiMs', () =>
      openai.responses.parse({
        model: 'gpt-5.6-luna',
        input: [
          { role: 'system', content: aiInstructions },
          {
            role: 'system',
            content: createProjectDetailsContext({
              customer,
              project: projectDetails,
            }),
          },
          {
            role: 'system',
            content: createWorkItemsContext(workItems),
          },
          {
            role: 'system',
            content: createMaterialsContext(materials),
          },
          ...messages,
        ],
        text: {
          format: zodTextFormat(ProjectResponseSchema, 'project_response'),
        },
      }),
    );

    if (!response.output_parsed) {
      throw new Error('OpenAI returned no structured response');
    }

    console.info('GENERATE OFFER SIZE', {
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
      cachedInputTokens: response.usage?.input_tokens_details?.cached_tokens ?? null,
      reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens ?? null,
      existingWorkItems: workItems.length,
      existingMaterials: materials.length,
      returnedWorkItems: response.output_parsed.workItems.length,
      returnedMaterials: response.output_parsed.materials.length,
      conversationMessages: messages.length,
    });

    return Response.json(response.output_parsed, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('GENERATE OFFER ERROR:', error);

    return Response.json(
      { error: 'Could not generate offer' },
      { status: 500, headers: corsHeaders },
    );
  } finally {
    console.info('GENERATE OFFER TIMING', {
      ...timings,
      totalMs: Math.round(performance.now() - started),
    });
  }
});
