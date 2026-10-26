import { ActivityService } from '../activity/activity.service';
import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import type { ProjectResponse } from './project-response';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly activity = inject(ActivityService);
  async generateOffer(projectId: string): Promise<ProjectResponse> {
    return this.activity.measure(
      'ai_request',
      async () => {
        const started = performance.now();
        try {
          const { data, error } = await supabase.functions.invoke('generate-offer', {
            body: { projectId },
          });

          if (error) {
            console.error('AI ERROR:', error);
            throw new Error('Kunne ikke hente svar fra Hovedet på sømmet', { cause: error });
          }

          return data as ProjectResponse;
        } finally {
          console.debug('[Hovedet på sømmet] AI-endpoint', {
            durationMs: Math.round(performance.now() - started),
          });
        }
      },
      { projectId },
    );
  }
}
