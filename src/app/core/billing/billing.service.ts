import { Injectable, OnDestroy, signal } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

export type BillingUsage = {
  companyId: string; status: 'trial' | 'exhausted' | 'active' | 'free' | 'internal';
  trialLimit: number; trialUsed: number; trialPending: number; trialRemaining: number; canGenerate: boolean;
};
export class TrialError extends Error {}

@Injectable({ providedIn: 'root' })
export class BillingService implements OnDestroy {
  readonly usage = signal<BillingUsage | null>(null);
  readonly error = signal('');
  readonly endedNotice = signal(false);
  private userId: string | null | undefined;
  version = 0;
  private loadSequence = 0;
  private revision = 0;
  private readonly subscription = supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (id !== this.userId) {
      this.userId = id;
      this.version++;
      this.usage.set(null);
      this.endedNotice.set(false);
      this.error.set('');
    }
  }).data.subscription;

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  accept(value: unknown, notify = false): void {
    if (!value || typeof value !== 'object') return;
    const usage = value as BillingUsage;
    if (typeof usage.companyId !== 'string' || !['trial','exhausted','active','free','internal'].includes(usage.status) ||
        !Number.isInteger(usage.trialRemaining) || !Number.isInteger(usage.trialUsed) ||
        typeof usage.canGenerate !== 'boolean') return;
    this.usage.set(usage);
    this.revision++;
    this.error.set('');
    if (notify && usage.status === 'exhausted') this.endedNotice.set(true);
    if (usage.status !== 'exhausted') this.endedNotice.set(false);
  }

  async load(companyId?: string): Promise<void> {
    const sequence = ++this.loadSequence;
    let version = this.version;
    let revision = this.revision;
    try {
      await supabase.auth.getSession();
      version = this.version;
      revision = this.revision;
      const { data, error } = await supabase.rpc('get_company_billing',
        companyId ? { p_company_id: companyId } : {});
      if (version !== this.version || sequence !== this.loadSequence || revision !== this.revision) return;
      if (error) throw error;
      this.accept(data);
    } catch {
      if (version === this.version && sequence === this.loadSequence && revision === this.revision)
        this.error.set('Kunne ikke hente abonnement og forbrug. Prøv igen.');
    }
  }
}
