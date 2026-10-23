import { Injectable, signal } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

export type ActivityAction =
  | 'login'
  | 'project_opened'
  | 'project_created'
  | 'ai_request'
  | 'work_edited'
  | 'material_edited'
  | 'work_status_changed'
  | 'material_status_changed'
  | 'offer_finalized'
  | 'offer_opened'
  | 'offer_status_changed'
  | 'pdf_downloaded'
  | 'profile_saved'
  | 'app_error';
export interface ActivityEvent {
  id: number;
  created_at: string;
  user_id: string;
  email: string;
  company_name: string | null;
  action: ActivityAction;
  success: boolean;
  duration_ms: number | null;
  error_code: string | null;
  project_id: string | null;
  offer_id: string | null;
  state: string | null;
}
export const activityLabels: Record<ActivityAction, string> = {
  login: 'Logget ind',
  project_opened: 'Projekt åbnet',
  project_created: 'Projekt oprettet',
  ai_request: 'AI-svar',
  work_edited: 'Opgave redigeret',
  material_edited: 'Materiale redigeret',
  work_status_changed: 'Opgavestatus ændret',
  material_status_changed: 'Materialestatus ændret',
  offer_finalized: 'Tilbud færdiggjort',
  offer_opened: 'Tilbud åbnet',
  offer_status_changed: 'Tilbudsstatus ændret',
  pdf_downloaded: 'PDF downloadet',
  profile_saved: 'Virksomhedsprofil gemt',
  app_error: 'Teknisk appfejl',
};

@Injectable({ providedIn: 'root' })
export class ActivityService {
  readonly isAdmin = signal(false);

  async checkAdmin(): Promise<boolean> {
    const { data, error } = await supabase.rpc('is_activity_admin');
    this.isAdmin.set(!error && data === true);
    return this.isAdmin();
  }

  async measure<T>(
    action: ActivityAction,
    work: () => Promise<T>,
    context: { projectId?: string; offerId?: string; state?: string; onlyFailure?: boolean } = {},
  ): Promise<T> {
    const started = performance.now();
    try {
      const value = await work();
      if (!context.onlyFailure)
        this.record(action, true, performance.now() - started, undefined, context);
      return value;
    } catch (error) {
      const cause = error instanceof Error && error.cause ? error.cause : error;
      const code =
        typeof cause === 'object' && cause !== null && 'code' in cause
          ? String(cause.code)
          : 'operation_failed';
      this.record(action, false, performance.now() - started, code, context);
      throw error;
    }
  }

  record(
    action: ActivityAction,
    success: boolean,
    duration?: number,
    code?: string,
    context: { projectId?: string; offerId?: string; state?: string; onlyFailure?: boolean } = {},
  ): void {
    // Logging never blocks the user's work. Never send messages, form values,
    // URLs, stack traces or arbitrary error messages.
    const errorCode = code && /^[A-Za-z0-9_.-]{1,50}$/.test(code) ? code : undefined;
    try {
      void Promise.resolve(
        supabase.rpc('record_activity', {
          p_action: action,
          p_success: success,
          p_duration_ms:
            duration === undefined
              ? undefined
              : Math.min(3600000, Math.max(0, Math.round(duration))),
          p_error_code: errorCode,
          p_project_id: context.projectId,
          p_offer_id: context.offerId,
          p_state: context.state,
        }),
      ).catch(() => undefined);
    } catch {
      /* Telemetry must never affect app operations. */
    }
  }

  async loadEvents(): Promise<ActivityEvent[]> {
    const { data, error } = await supabase.rpc('get_activity_events');
    if (error) throw new Error('Kunne ikke hente aktivitetsloggen. Kontrollér din adminadgang.');
    return data as unknown as ActivityEvent[];
  }
}
