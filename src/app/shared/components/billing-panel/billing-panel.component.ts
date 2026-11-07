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
  readonly subscriptionRequested = output<void>();
  constructor() {
    void this.billing.loadCheckoutConfiguration();
    effect(() => {
      void this.billing.load(this.companyId());
    });
  }
  reload(): void {
    void this.billing.load(this.companyId());
    void this.billing.loadCheckoutConfiguration();
  }
  openSubscription(): void {
    this.subscriptionRequested.emit();
    void this.router.navigate(['/company-profile'], { fragment: 'subscription' });
  }
}
