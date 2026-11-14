import { Injectable, OnDestroy, signal } from '@angular/core';
import { supabase } from '../supabase/supabase.client';

export type BillingUsage = {
  companyId: string; status: 'trial' | 'exhausted' | 'active' | 'free' | 'internal';
  trialLimit: number; trialUsed: number; trialPending: number; trialRemaining: number; canGenerate: boolean;
  paidLimit?: number; paidUsed?: number; paidPending?: number; paidRemaining?: number;
  transcriptionLimit?: number; transcriptionUsed?: number; transcriptionPending?: number;
  transcriptionRemaining?: number; canTranscribe?: boolean;
  periodStart?: string | null; periodEnd?: string | null; cancelAtPeriodEnd?: boolean;
  subscriptionState?: string; hasStripeCustomer?: boolean;
};
export class TrialError extends Error {}

@Injectable({ providedIn: 'root' })
export class BillingService implements OnDestroy {
  readonly usage = signal<BillingUsage | null>(null);
  readonly error = signal('');
  readonly endedNotice = signal(false);
  readonly paymentBusy = signal(false);
  readonly paymentError = signal('');
  readonly checkoutReady = signal(false);
  readonly testMode = signal(true);
  private configurationLoaded = false;
  private configurationValidUntil = 0;
  private configurationPending?: Promise<void>;
  private validUntil = 0;
  private pending?: { companyId?: string; request: Promise<void> };
  private userId: string | null | undefined;
  version = 0;
  private loadSequence = 0;
  private revision = 0;
  private readonly subscription = supabase.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (id !== this.userId) {
      this.userId = id;
      this.version++;
      this.validUntil = 0;
      this.pending = undefined;
      this.configurationLoaded = false;
      this.configurationValidUntil = 0;
      this.configurationPending = undefined;
      this.usage.set(null);
      this.endedNotice.set(false);
      this.error.set('');
      this.paymentError.set('');
    }
  }).data.subscription;

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  subscriberAccess(companyId?: string): boolean {
    const usage = this.usage();
    return !!usage && (!companyId || usage.companyId === companyId) && ['active', 'free', 'internal'].includes(usage.status);
  }

  limitReached(companyId?: string): boolean {
    const usage = this.usage();
    if (!usage || (companyId && usage.companyId !== companyId)) return false;
    return usage.status === 'exhausted' || (usage.status === 'active' &&
      (usage.paidUsed ?? 0) >= (usage.paidLimit ?? 200));
  }

  transcriptionLimitReached(companyId?: string): boolean {
    const usage = this.usage();
    if (!usage || (companyId && usage.companyId !== companyId)) return false;
    return usage.canTranscribe === false;
  }

  loadCheckoutConfiguration(force = false): Promise<void> {
    if (!force && this.configurationLoaded && Date.now() < this.configurationValidUntil) return Promise.resolve();
    if (this.configurationPending) return this.configurationPending;
    const request = this.fetchCheckoutConfiguration().finally(() => {
      if (this.configurationPending === request) this.configurationPending = undefined;
    });
    this.configurationPending = request;
    return request;
  }

  private async fetchCheckoutConfiguration(): Promise<void> {
    await supabase.auth.getSession();
    const version = this.version;
    try {
      const { data, error } = await supabase.functions.invoke('billing-session', { method: 'GET' });
      if (error || version !== this.version) return;
      this.checkoutReady.set(data?.checkoutReady === true);
      this.testMode.set(data?.testMode !== false);
      this.configurationLoaded = true;
      this.configurationValidUntil = Date.now() + 60_000;
    } catch { /* Existing project access remains available while payment is being configured. */ }
  }

  async openPayment(action: 'checkout' | 'portal'): Promise<void> {
    if (this.paymentBusy()) return;
    const version = this.version;
    this.paymentBusy.set(true);
    this.paymentError.set('');
    try {
      const { data, error } = await supabase.functions.invoke('billing-session', {
        body: { action, companyId: this.usage()?.companyId },
      });
      if (version !== this.version) return;
      if (error) {
        const body = error.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
        throw new Error(body?.error || 'Kunne ikke åbne Stripe. Prøv igen.');
      }
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || !['checkout.stripe.com','billing.stripe.com'].includes(url.hostname))
        throw new Error('Stripe returnerede en ugyldig betalingsadresse.');
      window.location.assign(url.href);
    } catch (error) {
      if (version === this.version) this.paymentError.set(error instanceof Error ? error.message : 'Kunne ikke åbne Stripe.');
    } finally { this.paymentBusy.set(false); }
  }

  accept(value: unknown, notify = false): void {
    if (!value || typeof value !== 'object') return;
    const usage = value as BillingUsage;
    if (typeof usage.companyId !== 'string' || !['trial','exhausted','active','free','internal'].includes(usage.status) ||
        !Number.isInteger(usage.trialRemaining) || !Number.isInteger(usage.trialUsed) ||
        typeof usage.canGenerate !== 'boolean') return;
    this.usage.set(usage);
    this.validUntil = Date.now() + 30_000;
    this.revision++;
    this.error.set('');
    if (notify && usage.status === 'exhausted') this.endedNotice.set(true);
    if (usage.status !== 'exhausted') this.endedNotice.set(false);
  }

  async load(companyId?: string, force = false): Promise<void> {
    await supabase.auth.getSession();
    const usage = this.usage();
    if (!force && usage && (!companyId || usage.companyId === companyId) && Date.now() < this.validUntil) return;
    const key = companyId ?? usage?.companyId;
    if (this.pending && (this.pending.companyId === key || !this.pending.companyId || !key)) {
      await this.pending.request;
      if (!companyId || this.usage()?.companyId === companyId) return;
    }
    const request = this.fetchUsage(companyId).finally(() => {
      if (this.pending?.request === request) this.pending = undefined;
    });
    this.pending = { companyId: key, request };
    return request;
  }

  private async fetchUsage(companyId?: string): Promise<void> {
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
