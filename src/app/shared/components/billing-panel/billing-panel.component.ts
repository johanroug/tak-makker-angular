import { Component, effect, inject, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { BillingService } from '../../../core/billing/billing.service';

@Component({
  selector: 'app-billing-panel',
  imports: [DatePipe],
  templateUrl: './billing-panel.component.html',
  styleUrl: './billing-panel.component.scss',
})
export class BillingPanelComponent {
  readonly billing = inject(BillingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly checkoutResult = this.route.snapshot.queryParamMap.get('checkout');
  readonly companyId = input<string>();
  readonly compact = input(false);
  readonly composerLayout = input(false);
  readonly prominent = input(false);
  readonly subscriptionRequested = output<void>();
  composerUsageLabel(): string {
    const usage = this.billing.usage();
    if (!usage) return 'Henter abonnement…';
    if (usage.status === 'internal') return 'Intern adgang';
    if (usage.status === 'free') return 'Fri adgang';
    if (usage.subscriptionState === 'past_due') return 'Betaling mangler';
    if (usage.status === 'active') return `${usage.paidRemaining ?? 0}/${usage.paidLimit ?? 200} samtaler tilbage`;
    return `${usage.trialRemaining} gratis forespørgsler tilbage`;
  }
  constructor() {
    void this.billing.loadCheckoutConfiguration();
    effect(() => {
      void this.billing.load(this.companyId(), !!this.checkoutResult);
    });
  }
  reload(): void {
    void this.billing.load(this.companyId(), true);
    void this.billing.loadCheckoutConfiguration(true);
  }
  openSubscription(): void {
    this.subscriptionRequested.emit();
    void this.router.navigate(['/company-profile'], { fragment: 'subscription' });
  }
}
