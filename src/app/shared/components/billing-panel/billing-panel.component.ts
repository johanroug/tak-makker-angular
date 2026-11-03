import { Component, effect, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { BillingService } from '../../../core/billing/billing.service';

@Component({
  selector: 'app-billing-panel',
  templateUrl: './billing-panel.component.html',
  styleUrl: './billing-panel.component.scss',
})
export class BillingPanelComponent {
  readonly billing = inject(BillingService);
  private readonly router = inject(Router);
  readonly companyId = input<string>();
  readonly compact = input(false);
  readonly subscriptionRequested = output<void>();
  constructor() {
    effect(() => {
      void this.billing.load(this.companyId());
    });
  }
  reload(): void {
    void this.billing.load(this.companyId());
  }
  openSubscription(): void {
    this.subscriptionRequested.emit();
    void this.router.navigate(['/company-profile'], { fragment: 'subscription' });
  }
}
