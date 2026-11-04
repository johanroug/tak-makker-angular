import { ActivityService } from '../activity/activity.service';
import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import type { ProjectResponse } from './project-response';
import { BillingService, TrialError } from '../billing/billing.service';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly activity = inject(ActivityService);
  private readonly billing = inject(BillingService);
  async generateOffer(projectId: string): Promise<ProjectResponse> {
    return this.activity.measure(
      'ai_request',
      async () => {
        const started = performance.now();
        const billingVersion = this.billing.version;
        try {
          const { data, error } = await supabase.functions.invoke('generate-offer', {
            body: { projectId },
          });

          if (error) {
            if (error.context instanceof Response) {
              const body = await error.context.clone().json().catch(() => null);
              if (billingVersion === this.billing.version) this.billing.accept(body?.usage, true);
              if (body?.code === 'TRIAL_EXHAUSTED') throw new TrialError('Du har brugt dine 10 gratis forespørgsler. Se dit abonnement i virksomhedsprofilen.');
              if (body?.code === 'TRIAL_BUSY') throw new TrialError('Dine resterende gratis forespørgsler er i gang. Vent på svar, og prøv igen.');
              if (body?.code === 'MONTHLY_LIMIT_REACHED') throw new TrialError('Virksomhedens 500 forespørgsler for denne abonnementsperiode er brugt. Se næste periode under Dit abonnement.');
              if (body?.code === 'MONTHLY_BUSY') throw new TrialError('De resterende forespørgsler er i gang. Vent på svar, og prøv igen.');
            }
            console.error('AI ERROR:', error);
            throw new Error('Kunne ikke hente svar fra Hovedet på sømmet', { cause: error });
          }

          if (billingVersion === this.billing.version) this.billing.accept(data?.usage, true);
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
