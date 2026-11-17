import type { ImageAnalysisInput } from '../projects/project-images.service';
import { ProjectImagesService } from '../projects/project-images.service';
import { ActivityService } from '../activity/activity.service';
import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase/supabase.client';
import type { ProjectResponse } from './project-response';
import { BillingService, TrialError } from '../billing/billing.service';

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private readonly images = inject(ProjectImagesService);
  private readonly activity = inject(ActivityService);
  private readonly billing = inject(BillingService);
  async generateOffer(projectId: string, messageId: string, imageInput?: ImageAnalysisInput): Promise<ProjectResponse> {
    return this.activity.measure(
      'ai_request',
      async () => {
        const started = performance.now();
        const billingVersion = this.billing.version;
        try {
          if (imageInput) {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user.id !== imageInput.ownerId) throw new TrialError('Brugerkontoen er ændret. Send igen.');
            try { await this.images.reserveAnalysis(imageInput.ownerId, projectId, imageInput.messageId, imageInput.images.map(image => image.id)); }
            catch (error) { throw new TrialError(error instanceof Error ? error.message : 'Billedkvoten kunne ikke kontrolleres. Prøv igen.'); }
          }
          const { data, error } = await supabase.functions.invoke('generate-offer', {
            body: { projectId, messageId, ...(imageInput ? { images: imageInput.images } : {}) },
          });

          if (error) {
            if (error.context instanceof Response) {
              const body = await error.context.clone().json().catch(() => null);
              if (billingVersion === this.billing.version) this.billing.accept(body?.usage, true);
              if (body?.code === 'AI_BUDGET_REACHED') throw new TrialError('AI er midlertidigt sat på pause. Prøv igen senere.');
              if (['AI_COOLDOWN', 'AI_PROJECT_BUSY', 'AI_MESSAGE_STALE', 'AI_MESSAGE_FAILED'].includes(body?.code)) throw new TrialError(body.error);
              if (body?.code === 'IMAGE_INPUT_INVALID' || body?.code === 'IMAGE_SUBSCRIPTION_REQUIRED') throw new TrialError(body.error);
              if (body?.code === 'TRIAL_EXHAUSTED') throw new TrialError('Du har brugt dine 10 gratis forespørgsler. Se dit abonnement i virksomhedsprofilen.');
              if (body?.code === 'TRIAL_BUSY') throw new TrialError('Dine resterende gratis forespørgsler er i gang. Vent på svar, og prøv igen.');
              if (body?.code === 'MONTHLY_LIMIT_REACHED') throw new TrialError('Virksomhedens 200 forespørgsler for denne abonnementsperiode er brugt. Se næste periode under Dit abonnement.');
              if (body?.code === 'MONTHLY_BUSY') throw new TrialError('De resterende forespørgsler er i gang. Vent på svar, og prøv igen.');
            }
            console.error('AI request failed');
            throw new Error('Kunne ikke hente svar fra Hovedet på sømmet');
          }

          if (imageInput && (!Array.isArray(data?.analyzedImageIds) || imageInput.images.some(image => !data.analyzedImageIds.includes(image.id)))) {
            throw new TrialError('Billedanalysen er ikke klar på serveren. Dine billeder er gemt lokalt. Prøv igen senere.');
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
